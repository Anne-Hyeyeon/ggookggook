import { renderHook, act } from "@testing-library/react";
import { useTimer } from "../useTimer";

describe("useTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("should initialize with given duration", () => {
    const { result } = renderHook(() => useTimer(20));
    expect(result.current.timeLeft).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });

  it("should count down when started", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.timeLeft).toBe(7);
  });

  it("should pause", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(3000));
    act(() => result.current.pause());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeLeft).toBe(7);
  });

  it("should reset to given duration", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(5000));
    act(() => result.current.reset(20));
    expect(result.current.timeLeft).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });

  it("should call onComplete when reaching 0", () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useTimer(3, onComplete));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
