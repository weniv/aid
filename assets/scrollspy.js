// 헤더 nav 스크롤스파이
// --------------------------------------------------------------
// 현재 뷰포트 중앙에 위치한 섹션의 nav 링크에 .is-active 를 부여합니다.
// rootMargin '-50% 0px -50% 0px' 로 뷰포트 중앙 가로선과 교차하는 섹션을 감지
// (한 시점에 대체로 한 섹션만 교차 → 정확한 한 개 활성화).
// 마지막 섹션을 지나 푸터로 내려가면 마지막 활성 상태를 유지(자연스러움).

const navLinks = document.querySelectorAll('.site-header__nav a');
const sectionToLink = new Map();

navLinks.forEach((link) => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('#') && href.length > 1) {
    const sec = document.getElementById(href.slice(1));
    if (sec) sectionToLink.set(sec, link);
  }
});

if (sectionToLink.size) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const targetLink = sectionToLink.get(entry.target);
        if (!targetLink) return;
        navLinks.forEach((l) => l.classList.remove('is-active'));
        targetLink.classList.add('is-active');
      });
    },
    { rootMargin: '-50% 0px -50% 0px' }
  );
  sectionToLink.forEach((_link, sec) => observer.observe(sec));
}
