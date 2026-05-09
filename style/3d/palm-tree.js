import * as THREE from 'three';

// 야자수 — 4단 스택 트렁크 + 4갈래 잎 캐노피
// 원본: threejs/src/mesh/tree.js (학습 프로젝트) 를 모듈화하면서 텍스처 경로만 정리.
// 반환 오브젝트는 원점 기준으로 trunk1 의 중심이 (0,0,0) 에 위치하므로,
// 행성/지면에 올릴 때는 호출 측에서 bounding box 의 min.y 만큼 들어올려 사용.
//
// 텍스처/Geometry/Material 은 모듈 단위로 1회만 만들어 모든 인스턴스가 공유합니다.
// (행성 위에 5그루 배치해도 텍스처 다운로드/디코딩, GPU 업로드는 1회.)
let shared = null;

function getShared() {
  if (shared) return shared;
  const loader = new THREE.TextureLoader();
  const basecolor   = loader.load(new URL('./textures/wood/wood_basecolor.jpg', import.meta.url).href);
  const normal      = loader.load(new URL('./textures/wood/wood_normal.jpg', import.meta.url).href);
  const rough       = loader.load(new URL('./textures/wood/wood_roughness.jpg', import.meta.url).href);
  const leafTexture = loader.load(new URL('./textures/leaf/leaf_texture.png', import.meta.url).href);

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0xa38049,
    map: basecolor,
    normalMap: normal,
    roughnessMap: rough,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x84ad88,
    side: THREE.DoubleSide,
    map: leafTexture,
    transparent: true,
  });

  const trunkGeometry = new THREE.CylinderGeometry(0.8, 1, 1.5);
  // 행성 위 작은 스케일이라 잎 세그먼트는 16x8 로도 실루엣 차이 없음.
  const leafGeometry  = new THREE.SphereGeometry(2, 16, 8, Math.PI / 3, Math.PI / 3);

  shared = { trunkMaterial, leafMaterial, trunkGeometry, leafGeometry };
  return shared;
}

export default function makePalmTree() {
  const { trunkMaterial, leafMaterial, trunkGeometry, leafGeometry } = getShared();

  const tree = new THREE.Group();
  const trunk = new THREE.Group();

  const trunk1 = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.add(trunk1);

  const trunk2 = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk2.position.set(0.1, 1.3, 0);
  trunk2.scale.set(0.9, 0.9, 0.9);
  trunk2.rotation.z = THREE.MathUtils.degToRad(-5);
  trunk.add(trunk2);

  const trunk3 = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk3.position.set(0.2, 2.5, 0);
  trunk3.scale.set(0.8, 0.8, 0.8);
  trunk3.rotation.z = THREE.MathUtils.degToRad(-5);
  trunk.add(trunk3);

  const trunk4 = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk4.scale.set(0.7, 0.7, 0.7);
  trunk4.position.set(0.3, 3.5, 0);
  trunk4.rotation.z = THREE.MathUtils.degToRad(-8);
  trunk.add(trunk4);
  tree.add(trunk);

  const leaf = new THREE.Group();

  const leaf1 = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf1.rotation.x = Math.PI / -2;
  leaf1.position.set(0, 3.2, 2);
  leaf.add(leaf1);

  const leaf2 = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf2.rotation.x = Math.PI / -2;
  leaf2.rotation.z = Math.PI / 2;
  leaf2.position.set(2, 3.2, 0);
  leaf.add(leaf2);

  const leaf3 = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf3.rotation.x = Math.PI / -2;
  leaf3.rotation.z = Math.PI;
  leaf3.position.set(0, 3.2, -2);
  leaf.add(leaf3);

  const leaf4 = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf4.rotation.x = Math.PI / -2;
  leaf4.rotation.z = Math.PI / -2;
  leaf4.position.set(-2, 3.2, 0);
  leaf.add(leaf4);
  tree.add(leaf);

  leaf.position.x = -0.4;
  leaf.rotation.z = THREE.MathUtils.degToRad(-10);

  for (const mesh of trunk.children) mesh.castShadow = true;
  for (const mesh of leaf.children) mesh.castShadow = true;

  return tree;
}
