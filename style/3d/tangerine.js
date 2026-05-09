import * as THREE from 'three';

// 감귤 (한라봉) — 도데카헤드론 본체 + 테트라헤드론 꼭지 + 줄기/잎
// 원본: threejs/src/mesh/tangerine.js
//
// 텍스처/Geometry/Material 은 모듈 단위로 1회만 만들어 모든 인스턴스가 공유합니다.
// (행성 위에 8개 배치해도 텍스처/메모리는 1세트.)
let shared = null;

function getShared() {
  if (shared) return shared;
  const loader = new THREE.TextureLoader();
  const basecolor = loader.load(new URL('./textures/orange/Orange_001_COLOR.jpg', import.meta.url).href);
  const normal    = loader.load(new URL('./textures/orange/Orange_001_NORM.jpg', import.meta.url).href);
  const rough     = loader.load(new URL('./textures/orange/Orange_001_ROUGH.jpg', import.meta.url).href);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb48c,
    map: basecolor,
    normalMap: normal,
    roughness: 0.2,
    roughnessMap: rough,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ca06e,
    side: THREE.DoubleSide,
  });

  const bottomGeometry = new THREE.DodecahedronGeometry(2, 1);
  // detail 3 → 2: 삼각형 수 약 1/4 로 줄지만 실루엣 차이는 거의 안 보임.
  const topGeometry    = new THREE.TetrahedronGeometry(0.8, 2);
  const stemGeometry   = new THREE.CylinderGeometry(0.08, 0.1, 0.4);
  const leafGeometry   = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI / 3);

  shared = { bodyMaterial, leafMaterial, bottomGeometry, topGeometry, stemGeometry, leafGeometry };
  return shared;
}

export default function makeTangerine() {
  const { bodyMaterial, leafMaterial, bottomGeometry, topGeometry, stemGeometry, leafGeometry } = getShared();

  const tangerine = new THREE.Group();
  const body = new THREE.Group();

  const bottom = new THREE.Mesh(bottomGeometry, bodyMaterial);
  body.add(bottom);

  const top = new THREE.Mesh(topGeometry, bodyMaterial);
  top.position.y = 1.7;
  body.add(top);

  const leaves = new THREE.Group();

  const stem = new THREE.Mesh(stemGeometry, leafMaterial);
  stem.position.y = 2.5;
  leaves.add(stem);

  const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf.position.set(-0.5, 2.4, -0.1);
  leaf.rotation.z = Math.PI / -2;
  leaves.add(leaf);

  tangerine.add(body);
  tangerine.add(leaves);
  for (const mesh of body.children) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  for (const mesh of leaves.children) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  return tangerine;
}
