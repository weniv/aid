// 스크롤 등장 애니메이션
// --------------------------------------------------------------
// .scroll-reveal 가 붙은 요소가 뷰포트에 진입/이탈할 때마다 .is-visible 을
// 토글해 CSS animation(scrollReveal)이 매번 재생되도록 합니다.
// (이탈 시엔 클래스가 제거되어 초기상태로 즉시 리셋 — 다시 진입하면 재생)
// prefers-reduced-motion 사용자는 CSS 쪽에서 즉시 노출됩니다.

const targets = document.querySelectorAll('.scroll-reveal');
if (targets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  targets.forEach((el) => observer.observe(el));
}
