import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 라이캣 — 위니브 마스코트 GLB 모델 비동기 로드
// 같은 모델을 여러 번 사용해도 GLB 는 한 번만 fetch 하도록 캐싱하고,
// 호출 측에는 매번 독립적으로 배치 가능한 clone 을 돌려줌.

let _modelPromise = null;

export default function loadLycat() {
  if (!_modelPromise) {
    const url = new URL('./models/Lycat-3d.glb', import.meta.url).href;
    _modelPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(url, (gltf) => {
        for (const child of gltf.scene.children) child.castShadow = true;
        resolve(gltf.scene);
      }, undefined, reject);
    });
  }
  // 같은 인스턴스를 두 곳에 add 하면 한쪽에서만 보이므로 항상 clone 반환
  return _modelPromise.then((scene) => scene.clone(true));
}
