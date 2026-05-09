# JEJU AI Creators · 3D 오브제 모듈

랜딩 히어로 행성 등 인터랙티브 영역에서 재사용하는 브랜드 3D 오브제를 모은 모듈입니다.
원본은 `threejs/` 폴더의 학습용 코드이며, 여기에 둔 버전은 정리·표준화한 사본입니다.

## 구성

```
style/3d/
├── index.js          # 진입점 (4개 export 묶음)
├── palm-tree.js      # 야자수    → makePalmTree()
├── tangerine.js      # 감귤(한라봉) → makeTangerine()
├── dolharubang.js    # 돌하르방  → makeDolharubang()
├── lycat.js          # 라이캣 (GLB 로더) → loadLycat()
├── textures/         # PBR 텍스처 (orange · wood · leaf · stone)
└── models/           # Lycat-3d.glb
```

## 사용

### importmap

페이지 `<head>` 에 다음을 두 키 모두 매핑하세요. `three/examples/jsm/` 는
`loadLycat()` 이 내부적으로 `GLTFLoader` 를 쓰기 때문에 필요합니다.

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/examples/jsm/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
```

### 모듈 사용

```js
import {
  makePalmTree,
  makeTangerine,
  makeDolharubang,
  loadLycat,
} from './style/3d/index.js';

scene.add(makePalmTree());
scene.add(makeTangerine());
scene.add(makeDolharubang());

// 라이캣은 GLB 라서 비동기
loadLycat().then((model) => {
  scene.add(model);
});
```

## API

| 함수 | 반환 | 비고 |
|---|---|---|
| `makePalmTree()` | `THREE.Group` (동기) | 호출 시 텍스처 비동기 로드 시작 |
| `makeTangerine()` | `THREE.Group` (동기) | 〃 |
| `makeDolharubang()` | `THREE.Group` (동기) | 〃 |
| `loadLycat()` | `Promise<THREE.Group>` | GLB fetch 1회 캐시 후 매번 `clone(true)` 반환 |

각 함수는 호출할 때마다 **새 인스턴스**를 돌려주므로, 한 행성에 여러 그루를 심으려면 그냥 여러 번 호출하면 됩니다.

## 좌표·스케일

오브제들은 원본 학습 프로젝트의 좌표를 그대로 유지합니다 (대략 4~5 단위 크기).
행성처럼 작은 공간에 올릴 때는 호출 측에서 다음 두 가지를 처리하세요.

1. **균일 스케일** — 가장 긴 변 기준으로 원하는 크기에 맞추기
2. **바닥 정렬** — `Box3.setFromObject(obj).min.y` 만큼 들어올려 평평한 바닥이 표면에 닿게

랜딩 페이지 `index.html` 의 `mountToPlanet()` 헬퍼가 두 작업을 한 번에 수행하는 예시입니다.

## 텍스처 경로

각 모듈은 `import.meta.url` 기준으로 텍스처를 로드하므로, **이 폴더만 통째로 옮기면**
어떤 페이지·번들러에서 import 해도 텍스처 경로가 깨지지 않습니다.
