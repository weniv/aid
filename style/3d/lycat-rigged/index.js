// 라이캣 GLB 의 팔/다리를 런타임에 분할해 어깨·엉덩이 pivot 으로 재구성한 모듈.
// 원본 style/3d/lycat.js 와 GLB 파일은 건드리지 않고 사이드바이사이드로 동작한다.
//
// 사용 예:
//   import { loadRiggedLycat } from './style/3d/lycat-rigged/index.js';
//   const rigged = await loadRiggedLycat();
//   scene.add(rigged.root);
//   rigged.setPose('walk');
//   // 매 프레임:
//   rigged.update(dt);

export { default as loadRiggedLycat } from './load-rigged-lycat.js';
