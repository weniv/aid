// AID 30+ 집중캠프 — Hero 영역 AI 신경망 컨셉 three.js 오브제
// 중앙 와이어프레임 코어 + 궤도를 도는 노드 + 노드 사이 연결선으로
// "신경망/AI"의 이미지를 단순한 프리미티브 조합으로 표현합니다.
import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas');
if (canvas) initHeroScene(canvas);

function initHeroScene(canvas) {
  const container = canvas.parentElement;

  // ---------- 기본 셋업 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  // 모션 최소화 선호 여부 (멀미·접근성 — prefers-reduced-motion)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // WebGL 미지원/생성 실패 시 캔버스를 숨기고 CSS 그라디언트 배경으로 폴백
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    canvas.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 컬러 팔레트 (브랜드 primary 계열) ----------
  const COLOR_PRIMARY = new THREE.Color(0x2e6ff2);
  const COLOR_LIGHT   = new THREE.Color(0x6ea3ff);
  const COLOR_DEEP    = new THREE.Color(0x145df0);

  // ---------- 중앙 코어 (와이어프레임 아이코사헤드론) ----------
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const coreGeometry = new THREE.IcosahedronGeometry(2.4, 1);
  const coreWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(coreGeometry),
    new THREE.LineBasicMaterial({
      color: COLOR_PRIMARY,
      transparent: true,
      opacity: 0.85,
    })
  );
  coreGroup.add(coreWire);

  // 안쪽 반투명 솔리드 (옅은 빛이 도는 듯한 느낌)
  const coreSolid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.35, 1),
    new THREE.MeshBasicMaterial({
      color: COLOR_LIGHT,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    })
  );
  coreGroup.add(coreSolid);

  // 코어 중심의 작은 점 (활성화 펄스)
  const corePulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 24),
    new THREE.MeshBasicMaterial({ color: COLOR_PRIMARY, transparent: true, opacity: 0.55 })
  );
  coreGroup.add(corePulse);

  // ---------- 궤도 노드 (뉴런) ----------
  const NODE_COUNT = 60;
  const nodes = [];
  const nodePositions = new Float32Array(NODE_COUNT * 3);
  const nodeMeta = []; // 각 노드의 궤도 파라미터

  for (let i = 0; i < NODE_COUNT; i++) {
    // 구면 좌표 + 약간의 두께(반지름 변화)로 살짝 두꺼운 껍질 형성
    const radius = 4.2 + Math.random() * 1.6;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    nodeMeta.push({
      radius,
      phi,
      theta,
      speed: 0.06 + Math.random() * 0.18,
      // 회전축을 살짝씩 다르게 줘서 다른 궤도처럼 보이게 함
      tilt: (Math.random() - 0.5) * 0.6,
    });
    nodePositions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
    nodePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    nodePositions[i * 3 + 2] = radius * Math.cos(phi);
    nodes.push(new THREE.Vector3(
      nodePositions[i * 3 + 0],
      nodePositions[i * 3 + 1],
      nodePositions[i * 3 + 2],
    ));
  }

  const nodeGeometry = new THREE.BufferGeometry();
  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  const nodeMaterial = new THREE.PointsMaterial({
    color: COLOR_LIGHT,
    size: 0.12,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
  });
  const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
  scene.add(nodePoints);

  // ---------- 연결선 (가까운 노드끼리 잇기 → 신경망 그래프) ----------
  // 매 프레임 거리 계산이 비싸지므로 페어 인덱스를 미리 산출.
  const CONNECT_DISTANCE = 2.4;
  const pairs = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      // 시작 시 거리가 가까운 페어만 채택 (대략적 그래프 구조)
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < CONNECT_DISTANCE) pairs.push([i, j]);
    }
  }
  const linePositions = new Float32Array(pairs.length * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: COLOR_PRIMARY,
    transparent: true,
    opacity: 0.18,
  });
  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineSegments);

  // ---------- 외곽 반짝이 입자 (배경 별/먼지) ----------
  const STAR_COUNT = 220;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 8 + Math.random() * 10;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    starPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: COLOR_DEEP,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  }));
  scene.add(stars);

  // ---------- 마우스 패럴랙스 ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 1.2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 0.6;
  });

  // ---------- 스크롤 임팩트 ----------
  // hero가 위로 사라지는 만큼을 0→1로 환산해 코어가 폭발적으로 커지게.
  // ease-in 곡선(progress^2)로 후반부에 임팩트가 집중되도록 한다.
  let scrollProgress = 0;
  function updateScrollProgress() {
    const rect = container.getBoundingClientRect();
    const range = rect.height || 1;
    const traveled = -rect.top;
    scrollProgress = Math.max(0, Math.min(1, traveled / range));
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();

  // ---------- 애니메이션 루프 ----------
  let inView = true;
  let raf = 0;
  const clock = new THREE.Clock();

  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    // 스크롤 임팩트 계수
    const sp = scrollProgress;
    const impact = sp * sp;            // 후반부 가속
    const fade = 1 - sp;               // 보조 요소 페이드
    const coreScale = 1 + impact * 7;  // 1× → 8×

    // 코어 회전 (스크롤 시 회전 가속)
    const spin = 0.12 + impact * 1.2;
    coreGroup.rotation.y = t * spin;
    coreGroup.rotation.x = Math.sin(t * 0.18) * 0.18;
    coreGroup.scale.setScalar(coreScale);

    // 코어 펄스 — 스크롤 동안엔 펄스 진폭이 더 커짐
    const pulseAmp = 0.18 + impact * 0.4;
    const pulseScale = 1 + Math.sin(t * 1.6) * pulseAmp;
    corePulse.scale.setScalar(pulseScale);
    corePulse.material.opacity = (0.4 + Math.sin(t * 1.6) * 0.2) * fade;

    // 와이어 코어는 임팩트 후반부에 부드럽게 사라져 다음 섹션으로 전환
    coreWire.material.opacity = 0.85 * (1 - Math.max(0, (sp - 0.55) / 0.45));
    coreSolid.material.opacity = 0.06 * fade;

    // 노드 궤도 갱신
    const posAttr = nodeGeometry.attributes.position;
    for (let i = 0; i < NODE_COUNT; i++) {
      const m = nodeMeta[i];
      m.theta += m.speed * 0.012;
      const sinPhi = Math.sin(m.phi + Math.sin(t * 0.4 + i) * 0.08);
      const cosPhi = Math.cos(m.phi + Math.sin(t * 0.4 + i) * 0.08);
      const x = m.radius * sinPhi * Math.cos(m.theta);
      const y = m.radius * sinPhi * Math.sin(m.theta) + Math.sin(t + i) * m.tilt * 0.4;
      const z = m.radius * cosPhi;
      posAttr.array[i * 3 + 0] = x;
      posAttr.array[i * 3 + 1] = y;
      posAttr.array[i * 3 + 2] = z;
      nodes[i].set(x, y, z);
    }
    posAttr.needsUpdate = true;

    // 연결선 갱신 (페어 인덱스는 고정, 좌표만 새로 채움)
    const linePos = lineGeometry.attributes.position.array;
    for (let k = 0; k < pairs.length; k++) {
      const [a, b] = pairs[k];
      linePos[k * 6 + 0] = nodes[a].x;
      linePos[k * 6 + 1] = nodes[a].y;
      linePos[k * 6 + 2] = nodes[a].z;
      linePos[k * 6 + 3] = nodes[b].x;
      linePos[k * 6 + 4] = nodes[b].y;
      linePos[k * 6 + 5] = nodes[b].z;
    }
    lineGeometry.attributes.position.needsUpdate = true;

    // 노드 / 연결선은 스크롤하면 같이 옅어져 코어가 화면을 차지하도록
    nodeMaterial.opacity = 0.95 * fade;
    lineMaterial.opacity = 0.18 * fade;

    // 별 천천히 회전 + 임팩트 시 살짝 페이드
    stars.rotation.y = t * 0.02;
    stars.material.opacity = 0.5 * fade;

    // 마우스 패럴랙스 + 스크롤 dolly — 코어 안으로 빨려들어가는 듯한 카메라
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 1.2;
    camera.position.y = -mouse.y * 1.2;
    camera.position.z = 16 - impact * 6;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // WebGL 컨텍스트 유실 시 루프 중단 (드라이버 리셋·탭 전환 등)
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });

  // 모션 최소화 선호 시: 애니메이션 루프 없이 정적 1프레임만 렌더
  if (prefersReducedMotion) {
    renderer.render(scene, camera);
    return;
  }

  // 뷰포트 안에 있을 때만 렌더 (성능 절약)
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!inView) inView = true;
      if (!raf) tick();
    } else {
      inView = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }, { rootMargin: '120px' });
  observer.observe(container);

  // 즉시 한 번 시작
  tick();
}
