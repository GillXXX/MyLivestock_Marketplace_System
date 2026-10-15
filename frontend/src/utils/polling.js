// Wraps a polling function so a new round only starts once the last one
// has finished, and not at all while the tab is hidden or the device is
// offline. Without this, a slow connection that takes longer than the
// polling interval piles up requests and gets slower still.
export function pollWhenIdle(busyRef, run) {
  return async () => {
    if (busyRef.current || document.hidden || !navigator.onLine) return;

    busyRef.current = true;
    try {
      await run();
    } finally {
      busyRef.current = false;
    }
  };
}
