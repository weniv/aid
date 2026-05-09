// JEJU AI Creators 브랜드 3D 오브제 모음
// 행성·히어로·기타 인터랙티브 영역에서 재사용하기 위한 모듈입니다.
//
// 사용 예:
//   import { makePalmTree, makeTangerine, makeDolharubang, loadLycat } from './style/3d/index.js';
//   scene.add(makePalmTree());
//   loadLycat().then((model) => scene.add(model));
//
// importmap 에 다음 두 키가 있어야 합니다:
//   "three": "<three.module.js URL>",
//   "three/examples/jsm/": "<examples/jsm/ URL with trailing slash>"

export { default as makePalmTree }   from './palm-tree.js';
export { default as makeTangerine }  from './tangerine.js';
export { default as makeDolharubang } from './dolharubang.js';
export { default as loadLycat }      from './lycat.js';
