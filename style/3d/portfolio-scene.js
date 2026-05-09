// Portfolio 섹션용 3D 데모 씬 — threejs/src/js/index.js 의 학습 결과물을 그대로
// 메인 페이지 안에서 OrbitControls 로 살펴볼 수 있게 옮겨온 모듈입니다.
// 메쉬 모듈(island/tangerine/tree/mountain/stone)은 threejs/src/mesh/* 를 그대로 import.
// (해당 모듈들은 텍스처를 import.meta.url 기준으로 로드하므로 어디서 import 해도 동일하게 동작합니다.)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import printIsland    from '../../threejs/src/mesh/island.js';
import printTangerine from '../../threejs/src/mesh/tangerine.js';
import printTree      from '../../threejs/src/mesh/tree.js';
import printMountain  from '../../threejs/src/mesh/mountain.js';
import printStone     from '../../threejs/src/mesh/stone.js';

const LYCAT_URL = new URL('../../threejs/src/models/Lycat-3d.glb', import.meta.url).href;

export default function initPortfolioScene(canvas) {
  const container = canvas.parentElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ccad5);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 오브제 배치 (threejs/src/js/index.js 그대로) ----------
  const island = printIsland();
  island.position.y = -1.5;
  scene.add(island);

  const tangerine = printTangerine();
  tangerine.position.set(-5, 0, -1);
  scene.add(tangerine);

  const miniTan = printTangerine();
  miniTan.scale.set(0.7, 0.7, 0.7);
  miniTan.position.set(-6, 0, 1.5);
  scene.add(miniTan);

  const tree = printTree();
  tree.position.set(5, -0.5, -1);
  tree.rotation.y = Math.PI / -3;
  scene.add(tree);

  const miniTree = printTree();
  miniTree.position.set(6.5, -1, 1);
  miniTree.scale.set(0.6, 0.6, 0.6);
  scene.add(miniTree);

  const mountain = printMountain();
  mountain.scale.set(1.2, 1.6, 1);
  mountain.position.set(0, 1, -1.8);
  scene.add(mountain);

  const stone = printStone();
  stone.position.set(3, -0.5, 1);
  stone.scale.set(0.9, 0.9, 0.9);
  stone.rotation.y = Math.PI / -8;
  scene.add(stone);

  // 라이캣 (GLB) — 비동기 로드
  new GLTFLoader().load(LYCAT_URL, (gltf) => {
    const model = gltf.scene;
    model.position.set(-2.8, -1.3, 1);
    model.rotation.y = Math.PI / 8;
    for (const mesh of model.children) mesh.castShadow = true;
    scene.add(model);
  });

  // ---------- 라이팅 (원본과 동일) ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const directionLight = new THREE.DirectionalLight(0xffffff, 1);
  directionLight.position.set(-10, 10, 10);
  directionLight.castShadow = true;
  scene.add(directionLight);

  const pl1 = new THREE.PointLight(0xff8c00, 1.5);
  pl1.position.set(5, 0, 0);
  scene.add(pl1);

  const pl2 = new THREE.PointLight(0xffe287, 2);
  pl2.position.set(-3, 2, 0);
  scene.add(pl2);

  // ---------- OrbitControls ----------
  // 초기에는 천천히 자동 회전 → 사용자가 만지면 멈춤 (다시 시작하지 않음)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = -0.5;
  controls.minDistance = 8;
  controls.maxDistance = 35;
  controls.target.set(0, 0, 0);
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // ---------- 뷰포트 안에 있을 때만 렌더 ----------
  let inView = false;
  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  const vis = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !inView) {
      inView = true;
      if (!raf) tick();
    } else if (!entry.isIntersecting && inView) {
      inView = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }, { rootMargin: '120px' });
  vis.observe(container);
}
