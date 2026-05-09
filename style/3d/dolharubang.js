import * as THREE from 'three';

// 돌하르방 — 4면 실린더 머리/몸통 + 박스 모자 + 팔 + 눈/코
// 원본: threejs/src/mesh/stone.js (학습 프로젝트) 를 모듈화하면서 텍스처 경로 정정.
export default function makeDolharubang() {
  const textureLoader = new THREE.TextureLoader();
  const stoneBase      = textureLoader.load(new URL('./textures/stone/stone_basecolor.jpg', import.meta.url).href);
  const stoneNormal    = textureLoader.load(new URL('./textures/stone/stone_normal.jpg', import.meta.url).href);
  const stoneRoughness = textureLoader.load(new URL('./textures/stone/stone_roughness.jpg', import.meta.url).href);

  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x565656,
    map: stoneBase,
    normalMap: stoneNormal,
    roughnessMap: stoneRoughness,
    roughness: 0.8,
  });

  const stone = new THREE.Group();

  const headGeometry = new THREE.CylinderGeometry(1, 1.5, 3, 4);
  const head = new THREE.Mesh(headGeometry, stoneMaterial);
  head.rotation.y = Math.PI / 4;
  head.position.y = 2.5;
  stone.add(head);

  const hatGeometry = new THREE.BoxGeometry(2, 0.2, 2);
  const hat = new THREE.Mesh(hatGeometry, stoneMaterial);
  hat.position.y = 3.5;
  stone.add(hat);

  const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 2, 4);
  const body = new THREE.Mesh(bodyGeometry, stoneMaterial);
  body.rotation.y = Math.PI / 4;
  stone.add(body);

  const armGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2.5, 6);
  const armLeft = new THREE.Mesh(armGeometry, stoneMaterial);
  armLeft.position.set(-1.5, 1.5, 0);
  armLeft.rotation.z = THREE.MathUtils.degToRad(60);
  stone.add(armLeft);

  const armRight = new THREE.Mesh(armGeometry, stoneMaterial);
  armRight.position.set(1.5, 1.5, 0);
  armRight.rotation.z = Math.PI / -3;
  stone.add(armRight);

  const eyeGeometry = new THREE.CapsuleGeometry(0.3, 0.2);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
  eyeLeft.position.set(-0.25, 2.5, 0.75);
  stone.add(eyeLeft);
  const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
  eyeRight.position.set(0.25, 2.5, 0.75);
  stone.add(eyeRight);

  const pupilGeometry = new THREE.SphereGeometry(0.1);
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const pupilLeft = new THREE.Mesh(pupilGeometry, pupilMaterial);
  pupilLeft.position.set(-0.2, 2.5, 1);
  stone.add(pupilLeft);

  const pupilRight = new THREE.Mesh(pupilGeometry, pupilMaterial);
  pupilRight.position.set(0.3, 2.5, 1);
  stone.add(pupilRight);

  const noseGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.4, 6);
  const nose = new THREE.Mesh(noseGeometry, stoneMaterial);
  nose.position.set(0, 2.2, 1);
  stone.add(nose);

  for (const mesh of stone.children) mesh.castShadow = true;

  return stone;
}
