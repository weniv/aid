import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 라이캣 GLB 는 팔/몸이 하나의 coat 메쉬, 좌/우 다리가 하나의 leg 메쉬로 합쳐져 있다.
// 이 모듈은 GLB 를 한 번만 로드한 뒤 face 단위로 자체 분할해 어깨/엉덩이 pivot 을
// 가진 본 구조로 재구성한다. 원본 lycat.js / GLB 는 건드리지 않는다.
//
// 분할 임계값은 vertex 분포 분석으로 결정 (style/3d/models/Lycat-3d.glb):
//   - 팔: face X centroid 의 절댓값 > 0.62 → 좌/우 팔
//   - 그 외 coat 면 → 몸/머리(body)
//   - 다리: face X centroid 부호로 좌/우 분리
const ARM_X_THRESHOLD = 0.62;
// GLTFLoader 가 노드 이름의 점·공백을 언더스코어로 sanitize 하므로
// '0. Lycat_coat' → '0__Lycat_coat' 처럼 변할 수 있다. 정확 일치 대신 부분 일치로 식별.
const isCoatNode = (n) => /coat/i.test(n.name || '');
const isLegNode  = (n) => /leg/i.test(n.name || '');

let _scenePromise = null;
let _cachePromise = null;

function loadOriginalScene() {
  if (!_scenePromise) {
    const url = new URL('../models/Lycat-3d.glb', import.meta.url).href;
    _scenePromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
  return _scenePromise;
}

// face 의 무게중심 좌표로 그룹을 결정하는 분류 함수를 받아
// 새 BufferGeometry 를 그룹별로 만든다. vertex 는 그룹별로 재인덱싱한다.
function splitByFace(geometry, classify) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal || null;
  const uv = geometry.attributes.uv || null;
  const index = geometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;

  const buckets = new Map();
  for (let t = 0; t < triCount; t++) {
    const ai = index ? index.getX(t * 3 + 0) : t * 3 + 0;
    const bi = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ci = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    const v0 = { x: pos.getX(ai), y: pos.getY(ai), z: pos.getZ(ai) };
    const v1 = { x: pos.getX(bi), y: pos.getY(bi), z: pos.getZ(bi) };
    const v2 = { x: pos.getX(ci), y: pos.getY(ci), z: pos.getZ(ci) };
    const ax = (v0.x + v1.x + v2.x) / 3;
    const ay = (v0.y + v1.y + v2.y) / 3;
    const az = (v0.z + v1.z + v2.z) / 3;
    const name = classify({ ax, ay, az, vs: [v0, v1, v2] });
    if (name == null) continue;
    let arr = buckets.get(name);
    if (!arr) { arr = []; buckets.set(name, arr); }
    arr.push(ai, bi, ci);
  }

  const out = {};
  for (const [name, oldIndices] of buckets) {
    const remap = new Map();
    const positions = [];
    const normals = [];
    const uvs = [];
    const newIndex = [];
    for (const oi of oldIndices) {
      let ni = remap.get(oi);
      if (ni === undefined) {
        ni = positions.length / 3;
        remap.set(oi, ni);
        positions.push(pos.getX(oi), pos.getY(oi), pos.getZ(oi));
        if (norm) normals.push(norm.getX(oi), norm.getY(oi), norm.getZ(oi));
        if (uv) uvs.push(uv.getX(oi), uv.getY(oi));
      }
      newIndex.push(ni);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (norm) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(newIndex);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    out[name] = g;
  }
  return out;
}

// 분할된 limb geometry 의 local origin 이 pivot 위치가 되도록 vertex 를 평행이동.
function offsetGeometry(geometry, offset) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) - offset.x);
    pos.setY(i, pos.getY(i) - offset.y);
    pos.setZ(i, pos.getZ(i) - offset.z);
  }
  pos.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

// 같은 limb 에 속하는 모든 sub-geometry 의 vertex 들로 pivot 을 계산.
//   shoulderL/hipL: X 의 최댓값(=가장 0 에 가까운 음수, 몸통 쪽 끝)
//   shoulderR/hipR: X 의 최솟값(=가장 0 에 가까운 양수)
//   Y 는 limb 최상단(어깨/엉덩이 상단)
//   Z 는 vertex 평균
//   thickness 는 단면 Y span — 어깨에서 90° 회전 시 외측 보정량으로 쓰인다.
function computeUnionPivot(geoms, mode) {
  let pivX = (mode === 'L') ? -Infinity : Infinity;
  let yTop = -Infinity, yBot = Infinity, zSum = 0, n = 0;
  for (const g of geoms) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (mode === 'L') { if (x > pivX) pivX = x; }
      else              { if (x < pivX) pivX = x; }
      if (y > yTop) yTop = y;
      if (y < yBot) yBot = y;
      zSum += z; n++;
    }
  }
  const pivot = new THREE.Vector3(pivX, yTop, zSum / n);
  pivot.thickness = yTop - yBot;
  return pivot;
}

async function buildSplitCache() {
  const scene = await loadOriginalScene();

  const cache = {
    staticNodes: [],
    bodyParts: [],
    armL: [], armR: [], legL: [], legR: [],
    pivots: { armL: null, armR: null, legL: null, legR: null },
  };

  for (const child of scene.children) {
    if (isCoatNode(child)) {
      // GLTFLoader 는 prim 이 여러 개인 노드를 Group + 자식 Mesh 로 만든다.
      const subs = child.isMesh ? [child] : child.children;
      for (const sub of subs) {
        if (!sub.isMesh) continue;
        // 어깨 경계 face (vertex 가 임계값을 가로지르는 face) 는 body 로 보낸다.
        // 이렇게 해야 팔 그룹에 어깨 안쪽 vertex 가 끌려 들어가지 않아
        // pivot 이 임계값 근처에 깔끔하게 잡힌다.
        const parts = splitByFace(sub.geometry, ({ vs }) => {
          if (vs.every(v => v.x < -ARM_X_THRESHOLD)) return 'armL';
          if (vs.every(v => v.x >  ARM_X_THRESHOLD)) return 'armR';
          return 'body';
        });
        if (parts.body) cache.bodyParts.push({ geometry: parts.body, material: sub.material });
        if (parts.armL) cache.armL.push({ geometry: parts.armL, material: sub.material });
        if (parts.armR) cache.armR.push({ geometry: parts.armR, material: sub.material });
      }
    } else if (isLegNode(child)) {
      const subs = child.isMesh ? [child] : child.children;
      for (const sub of subs) {
        if (!sub.isMesh) continue;
        const parts = splitByFace(sub.geometry, ({ ax }) => ax < 0 ? 'legL' : 'legR');
        if (parts.legL) cache.legL.push({ geometry: parts.legL, material: sub.material });
        if (parts.legR) cache.legR.push({ geometry: parts.legR, material: sub.material });
      }
    } else {
      // 정적 부위 — Mesh/Group 무관하게 하위 transform 까지 보존하기 위해 노드를 그대로 보관.
      // buildInstance 에서 clone(true) 로 복제해 배치한다.
      cache.staticNodes.push(child);
    }
  }

  cache.pivots.armL = computeUnionPivot(cache.armL.map(p => p.geometry), 'L');
  cache.pivots.armR = computeUnionPivot(cache.armR.map(p => p.geometry), 'R');
  cache.pivots.legL = computeUnionPivot(cache.legL.map(p => p.geometry), 'L');
  cache.pivots.legR = computeUnionPivot(cache.legR.map(p => p.geometry), 'R');

  for (const p of cache.armL) offsetGeometry(p.geometry, cache.pivots.armL);
  for (const p of cache.armR) offsetGeometry(p.geometry, cache.pivots.armR);
  for (const p of cache.legL) offsetGeometry(p.geometry, cache.pivots.legL);
  for (const p of cache.legR) offsetGeometry(p.geometry, cache.pivots.legR);

  return cache;
}

function makeLimbGroup(name, parts, pivot) {
  const g = new THREE.Group();
  g.name = name;
  g.position.copy(pivot);
  for (const p of parts) {
    const m = new THREE.Mesh(p.geometry, p.material);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function buildInstance(cache) {
  const root = new THREE.Group();
  root.name = 'lycat-rigged';

  for (const node of cache.staticNodes) {
    const c = node.clone(true);
    c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(c);
  }
  for (const b of cache.bodyParts) {
    const m = new THREE.Mesh(b.geometry, b.material);
    m.castShadow = true;
    m.name = 'coat.body';
    root.add(m);
  }

  const armL = makeLimbGroup('armL', cache.armL, cache.pivots.armL);
  const armR = makeLimbGroup('armR', cache.armR, cache.pivots.armR);
  const legL = makeLimbGroup('legL', cache.legL, cache.pivots.legL);
  const legR = makeLimbGroup('legR', cache.legR, cache.pivots.legR);
  root.add(armL, armR, legL, legR);

  // 좌팔 mesh 는 어깨 pivot 기준 -X 방향으로 뻗어 있고, 우팔은 +X 방향.
  // "팔 내리기" 는 어깨에서 Z 축 회전으로 -X/+X → -Y 로 보낸다.
  // 좌팔: rotateZ(+π/2)  (좌팔 -X → -Y)
  // 우팔: rotateZ(-π/2)  (우팔 +X → -Y)
  // 90° 회전 시 단면 두께가 그대로 +X(armL) / -X(armR) 방향으로 깔리면서 몸통 안쪽으로
  // 파고들기 때문에, rest/walk 에서는 단면 두께만큼 외측으로 평행이동해 어깨선을 맞춘다.
  // 걷기 swing 은 월드 X 축(앞뒤) 회전 — base 적용 후 swing 을 좌측곱해 월드 프레임에서 회전한다.
  const xAxis = new THREE.Vector3(1, 0, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const armOffsetL = cache.pivots.armL?.thickness || 0;
  const armOffsetR = cache.pivots.armR?.thickness || 0;
  const ZERO = new THREE.Vector3(0, 0, 0);
  const baseRest = {
    armL: { quat: new THREE.Quaternion().setFromAxisAngle(zAxis,  Math.PI / 2), offset: new THREE.Vector3(-armOffsetL, 0, 0) },
    armR: { quat: new THREE.Quaternion().setFromAxisAngle(zAxis, -Math.PI / 2), offset: new THREE.Vector3( armOffsetR, 0, 0) },
    legL: { quat: new THREE.Quaternion(), offset: ZERO },
    legR: { quat: new THREE.Quaternion(), offset: ZERO },
  };
  const baseTpose = {
    armL: { quat: new THREE.Quaternion(), offset: ZERO },
    armR: { quat: new THREE.Quaternion(), offset: ZERO },
    legL: { quat: new THREE.Quaternion(), offset: ZERO },
    legR: { quat: new THREE.Quaternion(), offset: ZERO },
  };

  const tmp = new THREE.Quaternion();
  function applyBase(part, base, pivot) {
    part.position.copy(pivot).add(base.offset);
    part.quaternion.copy(base.quat);
  }
  function applySwing(part, base, axis, angle) {
    tmp.setFromAxisAngle(axis, angle);
    // 좌측곱 (tmp * base): base 회전을 먼저 적용한 뒤 월드 X 축 swing 으로 앞뒤 회전.
    part.quaternion.multiplyQuaternions(tmp, base.quat);
  }

  const api = {
    root,
    parts: { armL, armR, legL, legR },
    pivots: cache.pivots,
    pose: 'tpose',           // 'tpose' | 'rest' | 'walk'
    walkSpeed: 1,            // 스윙 빈도 배수
    walkAmplitude: 0.6,      // 스윙 진폭 (rad)
    moveOnWalk: false,       // walk 모드일 때 root 위치 이동 여부
    moveDirection: new THREE.Vector3(0, 0, 1),
    moveSpeed: 0.5,
    _t: 0,
    setPose(pose) {
      this.pose = pose;
      const base = (pose === 'tpose') ? baseTpose : baseRest;
      applyBase(armL, base.armL, cache.pivots.armL);
      applyBase(armR, base.armR, cache.pivots.armR);
      applyBase(legL, base.legL, cache.pivots.legL);
      applyBase(legR, base.legR, cache.pivots.legR);
    },
    update(dt) {
      if (this.pose !== 'walk') return;
      this._t += dt;
      const swing = Math.sin(this._t * this.walkSpeed * 4) * this.walkAmplitude;
      applySwing(armL, baseRest.armL, xAxis,  swing);
      applySwing(armR, baseRest.armR, xAxis, -swing);
      applySwing(legL, baseRest.legL, xAxis, -swing);
      applySwing(legR, baseRest.legR, xAxis,  swing);
      if (this.moveOnWalk) {
        root.position.x += this.moveDirection.x * this.moveSpeed * dt;
        root.position.y += this.moveDirection.y * this.moveSpeed * dt;
        root.position.z += this.moveDirection.z * this.moveSpeed * dt;
      }
    },
  };
  api.setPose('tpose');
  return api;
}

// 같은 cache 를 공유하므로 BufferGeometry 가 인스턴스 간 공유된다.
// 각자 다른 변형이 필요하면 호출 측에서 mesh.geometry.clone() 해서 쓰면 된다.
export default async function loadRiggedLycat() {
  if (!_cachePromise) _cachePromise = buildSplitCache();
  const cache = await _cachePromise;
  return buildInstance(cache);
}
