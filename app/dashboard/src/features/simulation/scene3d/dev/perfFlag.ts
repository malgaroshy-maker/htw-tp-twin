/** True when the page was opened with `?perf=1`. Kept out of the component file so fast-refresh works. */
export const PERF_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');
