import { pollWhenIdle } from "./polling";

// A server that never answers (a dropped mobile connection), but stops
// waiting when the request is aborted, like the real fetch does.
// (A plain function, since react-scripts resets jest.fn mocks between tests.)
const calls = [];
const hangingFetch = (input, init = {}) => {
  calls.push([input, init]);
  return new Promise((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
};

const installTimeout = () => {
  let mod;
  jest.isolateModules(() => {
    mod = require("./requestTimeout");
  });
  window.fetch = hangingFetch;
  mod.installRequestTimeout();
};

describe("request timeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    calls.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  test("an API request that never answers fails after 30 seconds", async () => {
    installTimeout();
    const request = window.fetch("/api/farmer/transactions", { headers: {} });
    const outcome = request.then(() => "answered", (error) => error.name);

    jest.advanceTimersByTime(29 * 1000);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);

    await expect(outcome).resolves.toBe("AbortError");
  });

  test("an upload gets 5 minutes, not 30 seconds", async () => {
    installTimeout();
    let settled = false;
    const outcome = window
      .fetch("/api/listings", { method: "POST", body: new FormData() })
      .catch((error) => error.name)
      .finally(() => (settled = true));

    jest.advanceTimersByTime(60 * 1000);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(4 * 60 * 1000);
    await expect(outcome).resolves.toBe("AbortError");
  });

  test("non-API requests and requests with their own signal are left alone", () => {
    installTimeout();
    const own = new AbortController();
    window.fetch("https://router.project-osrm.org/route", {});
    window.fetch("/api/messages/1", { signal: own.signal });

    expect(calls[0][1].signal).toBeUndefined();
    expect(calls[1][1].signal).toBe(own.signal);
  });
});

describe("polling on a slow connection", () => {
  const setOnline = (value) => Object.defineProperty(window.navigator, "onLine", { value, configurable: true });

  beforeEach(() => setOnline(true));

  test("does not start a new round while the last one is still waiting", async () => {
    const busy = { current: false };
    let finish;
    const run = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    const poll = pollWhenIdle(busy, run);

    poll();
    poll();
    poll();
    expect(run).toHaveBeenCalledTimes(1);

    finish();
    await Promise.resolve();
    await Promise.resolve();
    poll();
    expect(run).toHaveBeenCalledTimes(2);
  });

  test("skips rounds while offline", () => {
    setOnline(false);
    const run = jest.fn(() => Promise.resolve());
    pollWhenIdle({ current: false }, run)();
    expect(run).not.toHaveBeenCalled();
  });

  test("a failed round doesn't block the next one", async () => {
    const busy = { current: false };
    const run = jest.fn(() => Promise.reject(new Error("timeout")));
    const poll = pollWhenIdle(busy, run);

    await poll().catch(() => {});
    expect(busy.current).toBe(false);
    await poll().catch(() => {});
    expect(run).toHaveBeenCalledTimes(2);
  });
});
