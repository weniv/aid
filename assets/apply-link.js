// SCHEDULE 접수 버튼 — 구글폼 링크 설정
// --------------------------------------------------------------
// SCHEDULE 표의 회차별 "접수하기" 버튼 8개를 제어합니다.
// 회차 일정이 확정되면 아래 SCHEDULE_FORM_URL 한 곳만 채우면 됩니다.
//
// (APPLY 섹션의 "신청하기" 버튼은 #schedule 로 이동하는 일반 앵커이며 폼 링크가 아닙니다)
//
// URL이 비어 있으면 버튼은 비활성(aria-disabled) + "준비중" 뱃지로 표시되고,
// 입력하면 클릭 시 새 탭으로 구글폼이 열립니다.

const SCHEDULE_FORM_URL = ''; // TODO: 회차 일정 확정 후 구글폼 URL 입력  예: 'https://forms.gle/xxxx'

document.querySelectorAll('.schedule-apply[data-form-link]').forEach((el) => {
  if (SCHEDULE_FORM_URL) {
    el.href = SCHEDULE_FORM_URL;
    el.target = '_blank';
    el.rel = 'noopener';
    el.removeAttribute('aria-disabled');
  } else {
    el.setAttribute('aria-disabled', 'true');
  }
});
