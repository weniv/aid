// 신청 폼(구글폼) 링크 설정 — APPLY 버튼과 SCHEDULE 접수 버튼을 독립 제어
// --------------------------------------------------------------
// 두 종류의 신청 버튼을 따로 켤 수 있습니다.
//
//   1) APPLY_FORM_URL    : APPLY 섹션 "신청서 작성하기" 버튼.
//                          구글폼 URL을 받으면 여기에 입력 → 즉시 활성화.
//   2) SCHEDULE_FORM_URL : SCHEDULE 표의 회차별 "접수하기" 버튼 8개.
//                          ⚠️ 회차 일정이 "미정"인 동안에는 비워 둡니다.
//                          회차 일정이 확정된 뒤에 입력 → 그때 활성화.
//
// 각 URL이 비어 있으면 해당 버튼은 비활성(aria-disabled) + "준비중"으로 표시됩니다.
// 클릭 시 새 탭으로 구글폼이 열립니다.

const APPLY_FORM_URL = '';    // TODO: 구글폼 URL 입력 (APPLY 신청 버튼)   예: 'https://forms.gle/xxxx'
const SCHEDULE_FORM_URL = ''; // TODO: 회차 일정 확정 후 입력 (SCHEDULE 접수 버튼)

function wireFormLinks(selector, url) {
  document.querySelectorAll(selector).forEach((el) => {
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
      el.removeAttribute('aria-disabled');
    } else {
      el.setAttribute('aria-disabled', 'true');
    }
  });
}

// APPLY 섹션 신청 버튼 (구글폼만 들어오면 활성화)
wireFormLinks('.apply-cta__primary[data-form-link]', APPLY_FORM_URL);

// SCHEDULE 접수 버튼 8개 (회차 일정 확정 후 별도로 활성화)
wireFormLinks('.schedule-apply[data-form-link]', SCHEDULE_FORM_URL);
