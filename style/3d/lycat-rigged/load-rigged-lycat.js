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

// 팔의 상단-몸통쪽 모서리(x_local≈0, y_local≈0) 를 quarter-arc 로 둥글게 깎는다.
// 회전 후 outer-top 코너로 나와 어깨캡 위로 튀어나오는 부분을 geometry 단계에서 제거.
//   호 중심 = (sign*r, -r), 반경 r. armL 은 sign=-1, armR 은 sign=+1.
function bevelArmTopCorner(geometry, r, side) {
  if (r <= 0) return;
  const pos = geometry.attributes.position;
  const sign = (side === 'L') ? -1 : +1;
  const cx = sign * r;
  const cy = -r;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const inX = (sign === -1) ? (x >= -r && x <= 0) : (x >= 0 && x <= r);
    const inY = (y >= -r && y <= 0);
    if (!(inX && inY)) continue;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > r && d > 1e-12) {
      const k = r / d;
      pos.setX(i, cx + dx * k);
      pos.setY(i, cy + dy * k);
    }
  }
  pos.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (geometry.attributes.normal) geometry.computeVertexNormals();
}

// _origPos 를 복원한 뒤 새 반경으로 다시 bevel — 슬라이더 변경에도 누적 안 되도록.
function applyArmBevel(parts, r, side) {
  for (const p of parts) {
    if (p._origPos) {
      p.geometry.attributes.position.array.set(p._origPos);
      p.geometry.attributes.position.needsUpdate = true;
    }
    if (r > 0) {
      bevelArmTopCorner(p.geometry, r, side);
    } else {
      p.geometry.computeBoundingBox();
      p.geometry.computeBoundingSphere();
      if (p.geometry.attributes.normal) p.geometry.computeVertexNormals();
    }
  }
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

  for (const p of cache.armL) {
    offsetGeometry(p.geometry, cache.pivots.armL);
    p._origPos = new Float32Array(p.geometry.attributes.position.array);
  }
  for (const p of cache.armR) {
    offsetGeometry(p.geometry, cache.pivots.armR);
    p._origPos = new Float32Array(p.geometry.attributes.position.array);
  }
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

  // 어깨 cap — coat 를 face 단위로 분리하면 어깨가 양쪽 모두 열린 단면으로 남고, 회전 후 그
  // 구멍이 노출돼 "팔 안과 몸통 안이 텅 비어 보인다". 어깨 pivot 에 단면 두께만 한 구를 박아
  // 시각적으로 메운다. root 에 직접 붙어 팔 회전과 무관하게 어깨 위치를 지킨다.
  // T-pose 에서는 원본 메쉬가 자연스럽게 이어지므로 숨겨 Z-fighting 을 피한다.
  function makeShoulderCap(pivot, material, scale) {
    const r = (pivot?.thickness || 0) * scale;
    if (r <= 0 || !material) return null;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), material);
    m.castShadow = true;
    return m;
  }
  function placeShoulderCap(cap, pivot, yMul, zMul) {
    if (!cap || !pivot) return;
    const t = pivot.thickness || 0;
    cap.position.copy(pivot);
    cap.position.y += t * yMul;
    cap.position.z += t * zMul;
  }
  const armMat = cache.armL[0]?.material || cache.armR[0]?.material || cache.bodyParts[0]?.material;
  let capL = makeShoulderCap(cache.pivots.armL, armMat, 0.25);
  let capR = makeShoulderCap(cache.pivots.armR, armMat, 0.25);
  if (capL) { capL.name = 'shoulderCapL'; root.add(capL); }
  if (capR) { capR.name = 'shoulderCapR'; root.add(capR); }

  // 좌팔 mesh 는 어깨 pivot 기준 -X 방향으로 뻗어 있고, 우팔은 +X 방향.
  // "팔 내리기" 는 어깨에서 Z 축 회전으로 -X/+X → -Y 로 보낸다.
  // 좌팔: rotateZ(+π/2)  (좌팔 -X → -Y)
  // 우팔: rotateZ(-π/2)  (우팔 +X → -Y)
  // 90° 회전 시 단면 두께가 그대로 +X(armL) / -X(armR) 방향으로 깔리면서 몸통 안쪽으로
  // 파고들어서, rest/walk 에서는 외측으로 평행이동해 어깨선을 맞춘다.
  // 보정량 = 단면 두께 × shoulderInset. 1.0 이면 팔이 완전히 몸 밖으로 나오지만
  // 어깨 접합부가 끊겨 보이고, 0 이면 몸 안으로 파고든다. 0.25 정도가 자연스럽다.
  // 걷기 swing 은 월드 X 축(앞뒤) 회전 — base 적용 후 swing 을 좌측곱해 월드 프레임에서 회전한다.
  const xAxis = new THREE.Vector3(1, 0, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const thickL = cache.pivots.armL?.thickness || 0;
  const thickR = cache.pivots.armR?.thickness || 0;
  const ZERO = new THREE.Vector3(0, 0, 0);
  const baseRest = {
    armL: { quat: new THREE.Quaternion().setFromAxisAngle(zAxis,  Math.PI / 2), offset: new THREE.Vector3() },
    armR: { quat: new THREE.Quaternion().setFromAxisAngle(zAxis, -Math.PI / 2), offset: new THREE.Vector3() },
    legL: { quat: new THREE.Quaternion(), offset: ZERO },
    legR: { quat: new THREE.Quaternion(), offset: ZERO },
  };
  const baseTpose = {
    armL: { quat: new THREE.Quaternion(), offset: ZERO },
    armR: { quat: new THREE.Quaternion(), offset: ZERO },
    legL: { quat: new THREE.Quaternion(), offset: ZERO },
    legR: { quat: new THREE.Quaternion(), offset: ZERO },
  };

  function refreshArmOffsets(inset) {
    baseRest.armL.offset.set(-thickL * inset, 0, 0);
    baseRest.armR.offset.set( thickR * inset, 0, 0);
  }

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
    _shoulderInset: 0.25,
    get shoulderInset() { return this._shoulderInset; },
    set shoulderInset(v) {
      this._shoulderInset = v;
      refreshArmOffsets(v);
      // 현재 자세를 다시 적용해 새 offset 을 반영.
      this.setPose(this.pose);
    },
    _shoulderCapScale: 0.25,
    get shoulderCapScale() { return this._shoulderCapScale; },
    set shoulderCapScale(v) {
      this._shoulderCapScale = v;
      const tL = cache.pivots.armL?.thickness || 0;
      const tR = cache.pivots.armR?.thickness || 0;
      if (capL) {
        capL.geometry.dispose();
        capL.geometry = new THREE.SphereGeometry(Math.max(1e-4, tL * v), 20, 14);
        capL.visible = (v > 0) && (this.pose !== 'tpose');
      }
      if (capR) {
        capR.geometry.dispose();
        capR.geometry = new THREE.SphereGeometry(Math.max(1e-4, tR * v), 20, 14);
        capR.visible = (v > 0) && (this.pose !== 'tpose');
      }
    },
    // 어깨 캡 Y 위치 — pivot.y 기준 thickness 배수(+ 위, - 아래).
    _shoulderCapY: -0.2,
    get shoulderCapY() { return this._shoulderCapY; },
    set shoulderCapY(v) {
      this._shoulderCapY = v;
      placeShoulderCap(capL, cache.pivots.armL, v, this._shoulderCapZ);
      placeShoulderCap(capR, cache.pivots.armR, v, this._shoulderCapZ);
    },
    // 어깨 캡 Z 위치 — pivot.z 기준 thickness 배수(+ 앞, - 뒤).
    _shoulderCapZ: -0.1,
    get shoulderCapZ() { return this._shoulderCapZ; },
    set shoulderCapZ(v) {
      this._shoulderCapZ = v;
      placeShoulderCap(capL, cache.pivots.armL, this._shoulderCapY, v);
      placeShoulderCap(capR, cache.pivots.armR, this._shoulderCapY, v);
    },
    // 팔 위쪽-몸통쪽 모서리를 둥글게 깎는 정도 — thickness 배수. 회전 후 outer-top 으로
    // 나오는 모서리가 어깨캡 위로 튀어나오는 걸 geometry 단계에서 줄인다.
    // T-pose 에서는 원본 모서리가 자연스러우므로 자동으로 0 이 적용된다.
    _armBevel: 0.4,
    get armBevel() { return this._armBevel; },
    set armBevel(v) {
      this._armBevel = v;
      if (this.pose === 'tpose') return;
      const tL = cache.pivots.armL?.thickness || 0;
      const tR = cache.pivots.armR?.thickness || 0;
      applyArmBevel(cache.armL, tL * v, 'L');
      applyArmBevel(cache.armR, tR * v, 'R');
    },
    _t: 0,
    setPose(pose) {
      this.pose = pose;
      const base = (pose === 'tpose') ? baseTpose : baseRest;
      applyBase(armL, base.armL, cache.pivots.armL);
      applyBase(armR, base.armR, cache.pivots.armR);
      applyBase(legL, base.legL, cache.pivots.legL);
      applyBase(legR, base.legR, cache.pivots.legR);
      const showCap = (pose !== 'tpose') && (this._shoulderCapScale > 0);
      if (capL) capL.visible = showCap;
      if (capR) capR.visible = showCap;
      // T-pose 에서는 원본 모서리, 그 외 자세에서는 armBevel 적용.
      const tL = cache.pivots.armL?.thickness || 0;
      const tR = cache.pivots.armR?.thickness || 0;
      const r = (pose === 'tpose') ? 0 : this._armBevel;
      applyArmBevel(cache.armL, tL * r, 'L');
      applyArmBevel(cache.armR, tR * r, 'R');
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
  refreshArmOffsets(api._shoulderInset);
  placeShoulderCap(capL, cache.pivots.armL, api._shoulderCapY, api._shoulderCapZ);
  placeShoulderCap(capR, cache.pivots.armR, api._shoulderCapY, api._shoulderCapZ);
  // setPose('tpose') 가 자동으로 베벨 0 을 적용 — 따로 호출할 필요 없음.
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
