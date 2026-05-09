# WENIV Style System

[weniv.co.kr](https://weniv.co.kr) 의 스타일을 다른 프로젝트에서도 재사용하기 위해 추출·정리한 디자인 시스템입니다.

원본 사이트는 Next.js + Pretendard + CSS 변수 기반으로 만들어져 있어서, 이를 다음과 같이 재구성했습니다.

- **CSS 변수(토큰) 중심**의 컬러/효과 시스템
- **Pretendard Variable** 폰트 (다크/라이트 모드 자동)
- 브라우저 reset + 자주 쓰는 유틸리티 클래스
- BEM 스타일로 일반화한 재사용 컴포넌트

---

## 폴더 구조

```
style/
├── index.css        # 모든 스타일을 한 번에 import 하는 진입점
├── tokens.css       # CSS 변수 (컬러, 그림자, 라이트/다크 테마)
├── fonts.css        # Pretendard @font-face 정의
├── reset.css        # 브라우저 기본 스타일 초기화
├── base.css         # body 기본값 + 유틸 클래스 (.max-width, .a11y-hidden ...)
├── components.css   # 재사용 컴포넌트 (.btn, .card, .nav-pill ...)
├── fonts/
│   └── pretendard.woff2     # Pretendard Variable Font
├── raw/             # weniv.co.kr 에서 받아온 원본 CSS (참조용)
│   ├── 45f3905322a87357.css
│   ├── ce7aa9b799668111.css   # Swiper 라이브러리
│   ├── fb274dcf2f40ea0f.css
│   ├── a3db2d9c2812f06a.css
│   └── fec2785ef5fd482e.css
└── README.md
```

---

## 빠르게 시작하기

### 1. style 폴더를 새 프로젝트로 복사

```
my-project/
└── style/        ← 이 폴더 통째로 복사
```

### 2. HTML 에서 link

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="./style/index.css" />
  </head>
  <body>
    <main class="max-width">
      <h1>안녕하세요</h1>
      <button type="button" class="btn btn--medium btn--primary">시작하기</button>
    </main>
  </body>
</html>
```

이게 끝입니다. 폰트, 컬러, reset, 컴포넌트 모두 사용 가능한 상태가 됩니다.

### 일부만 골라 쓰기

토큰만 필요하다면:

```html
<link rel="stylesheet" href="./style/tokens.css" />
```

다음 순서로 import 하세요. **순서가 중요합니다.**

```
tokens → fonts → reset → base → components
```

---

## 디자인 토큰

`tokens.css` 가 정의하는 CSS 변수들. **`var(--이름)`** 으로 어디서든 사용 가능합니다.

### 컬러

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--background` | `#fff` | `#1f2123` | 페이지 배경 |
| `--surface` | `#121314` | `#fff` | 본문 텍스트 / 어두운 패널 |
| `--primary` | `#2e6ff2` | `#3075ff` | 브랜드 메인 (블루) |
| `--primary-lighten` / `-darken` | — | — | 호버/액티브 상태 |
| `--primary-a11y` | `#2861d2` | — | 본문 위 링크 등 명도 대비 보정 |
| `--activation` | `#dee8ff` | `#2b3444` | 강조 배경 (호버 등) |
| `--grayLv1` | `#f3f5fa` | `#121314` | 가장 옅은 회색 (배경) |
| `--grayLv2` | `#d9dbe0` | `#595f66` | 보더, 비활성 |
| `--grayLv3` | `#8d9299` | `#8d9299` | 보조 텍스트 |
| `--grayLv4` | `#47494d` | `#f3f5fa` | 본문 보조 텍스트 |
| `--error` | `#ff3440` | `#fc7377` | 에러 |
| `--warn` | `#ffc533` | `#ffe187` | 경고 |
| `--fixed-white` / `--fixed-black` | 항상 흰색 / 검은색 | — | 테마와 무관하게 고정 |

각 컬러는 `--XXX-lighten`, `--XXX-darken`, `--XXX-text` (해당 색 위에 올라갈 텍스트 컬러), `--XXX-rgb` (rgba() 용 RGB 값) 변형도 있습니다.

### 코드 하이라이트 컬러

`--code-pink`, `--code-purple`, `--code-blue`, `--code-green`, `--code-orange`

### 효과

`--effect-shadow` — 카드/패널에 사용하는 기본 그림자

### 다크 모드

- 기본은 라이트 테마
- `<html class="theme-dark">` 으로 강제 전환
- 또는 OS 가 다크 모드면 `prefers-color-scheme: dark` 로 자동 전환

```html
<!-- 다크 모드 강제 -->
<html class="theme-dark">

<!-- 라이트 모드 강제 -->
<html class="theme-light">

<!-- OS 따라감 (기본) -->
<html>
```

---

## 사이즈 단위

`reset.css` 가 `html { font-size: 62.5% }` 를 설정합니다. **`1rem = 10px`** 이 되어 디자인 시안의 px 값을 그대로 옮기기 쉽습니다.

```css
.box {
  padding: 1.6rem;   /* 16px */
  border-radius: 2rem; /* 20px */
}
```

대부분의 본문 텍스트는 `clamp(min, vw, max)` 로 화면 폭에 따라 부드럽게 변합니다.

### 사용자 글자 크기 옵션

`.size0` ~ `.size4` 클래스를 `<body>` 에 부여하면 본문 글자 크기가 바뀝니다. 접근성 옵션으로 활용 가능합니다.

```html
<body class="size3">  <!-- 기본보다 한 단계 크게 -->
```

---

## 유틸리티 클래스 (base.css)

| 클래스 | 용도 |
|---|---|
| `.max-width` | 가운데 정렬 컨테이너 (max 1190px, 좌우 여백 2rem) |
| `.a11y-hidden` | 시각적으로는 숨기되 스크린 리더에는 노출 |
| `.sl-ellipsis` | 한 줄 말줄임 (`...`) |
| `.multi-ellipsis` | 두 줄 말줄임 |
| `.txt-highlight` | 본문 안 강조 텍스트 (브랜드 컬러 + bold) |
| `.contents` | flex 컨테이너 안에서 남은 영역 채우기 |

---

## 컴포넌트 (components.css)

### 버튼

```html
<!-- Primary (브랜드) 버튼 -->
<button class="btn btn--medium btn--primary">시작하기</button>

<!-- Outline 버튼 -->
<button class="btn btn--small btn--outline">자세히 보기</button>

<!-- White 버튼 (배경 위에) -->
<button class="btn btn--medium btn--white">취소</button>

<!-- Activation (강조 배경) -->
<button class="btn btn--small btn--activation">선택</button>
```

크기: `.btn--medium` (반응형 18~19.6rem 폭) / `.btn--small` (자동 폭)

색상 variant: `.btn--primary` / `.btn--white` / `.btn--outline` / `.btn--activation`

### 카드

```html
<article class="card">
  <img src="..." alt="" />
  <div style="padding: 2.8rem 3.2rem;">
    <h3>제목</h3>
    <p>본문</p>
  </div>
</article>
```

### 네비게이션 (알약형)

```html
<ul style="display: flex; gap: .8rem;">
  <li><a class="nav-pill is-active">전체</a></li>
  <li><a class="nav-pill">강의</a></li>
  <li><a class="nav-pill">도서</a></li>
</ul>
```

### 캐러셀 좌우 이동 버튼

```html
<button class="arrow-btn" aria-label="이전">
  <svg>...</svg>
</button>
<button class="arrow-btn arrow-btn--next" aria-label="다음">
  <svg>...</svg>
</button>
```

### 인용 블록

```html
<blockquote class="quote">
  AI 교육의 미래
</blockquote>
```

### 검색창

```html
<input type="search" class="search-input" placeholder="검색어를 입력하세요" />
```

---

## React / Next.js / Vite 에서 쓰기

### Vite / CRA / 일반 번들러

`main.jsx` 또는 `main.tsx` 상단에서 import:

```js
import "./style/index.css";
```

### Next.js (app router)

`app/layout.tsx` 에서:

```tsx
import "../style/index.css";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

폰트 파일 경로가 깨지지 않도록, `style/` 폴더를 `public/` 안에 두거나 `next.config.js` 에서 정적 자산 경로를 맞춰주세요.

---

## 폰트 정보

- **Pretendard Variable** (font-weight 45 ~ 920)
- 라이선스: SIL Open Font License 1.1 (상업적 사용 가능)
- 원본: <https://github.com/orioncactus/pretendard>

`fonts.css` 의 `src: url("./fonts/pretendard.woff2")` 경로는 `style/` 폴더 기준의 상대 경로입니다. 폴더 구조를 옮길 경우 이 경로도 함께 수정하세요.

---

## 원본과의 차이

`raw/` 폴더의 파일들은 weniv.co.kr 에서 그대로 받아온 원본입니다. 정리된 파일과 비교하면 다음과 같은 변경이 있었습니다.

- Next.js 의 해시된 폰트 변수명 (`__pretendard_fde3a9`) 을 일반 이름 (`Pretendard`) 으로 변경
- 폰트 경로를 `/_next/static/media/...` 에서 `./fonts/pretendard.woff2` 로 변경
- weniv 내부 페이지에 종속된 컴포넌트 (Banner, Footer, Header) 는 제외
- 일부 컴포넌트는 일반화된 클래스명 (`.Button_button__2jXbL` → `.btn`) 으로 재작성
- Swiper 라이브러리 CSS 는 제외 (필요 시 `npm install swiper` 권장)

---

## 라이선스

WENIV 의 디자인 토큰/컴포넌트 코드를 기반으로 합니다. 외부 공개 프로젝트에 사용하는 경우 WENIV 측에 사용 동의를 받는 것을 권장합니다.

Pretendard 폰트는 OFL 1.1 라이선스를 따릅니다.
