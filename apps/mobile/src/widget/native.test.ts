import type { Platform } from 'react-native';

const mockConstants = { executionEnvironment: 'standalone' };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const mockIosUpdate = jest.fn();
const mockAndroidUpdate = jest.fn();
const mockRegisterTaskHandler = jest.fn();
// Stand-ins for the native-backed modules, which may throw on import (a missing native module).
const mockModules = { requires: 0, iosThrows: false, androidThrows: false };
jest.mock('@/widget/iosWidget', () => {
  mockModules.requires += 1;
  if (mockModules.iosThrows) throw new Error("Cannot find native module 'ExpoWidgets'");
  return { updateIosWidget: mockIosUpdate };
});
jest.mock('@/widget/androidWidget', () => {
  mockModules.requires += 1;
  if (mockModules.androidThrows) throw new Error("TurboModuleRegistry.getEnforcing(...): 'AndroidWidget' could not be found");
  return { updateAndroidWidget: mockAndroidUpdate, registerAndroidWidgetTaskHandler: mockRegisterTaskHandler };
});

// A fresh registry per load: the "reported once" flag is module-level and the widget modules are cached once required.
function loadNative(os: typeof Platform.OS = 'ios'): typeof import('./native') {
  jest.resetModules();
  const fresh: typeof import('react-native') = require('react-native');
  fresh.Platform.OS = os;
  return require('./native');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockConstants.executionEnvironment = 'standalone';
  Object.assign(mockModules, { requires: 0, iosThrows: false, androidThrows: false });
});

describe('loadWidgetUpdater', () => {
  it('loads the iOS updater on iOS', () => {
    expect(loadNative().loadWidgetUpdater()).toBe(mockIosUpdate);
  });

  it('loads the Android updater on Android', () => {
    expect(loadNative('android').loadWidgetUpdater()).toBe(mockAndroidUpdate);
  });

  it('works in a bare dev build', () => {
    mockConstants.executionEnvironment = 'bare';
    expect(loadNative().loadWidgetUpdater()).toBe(mockIosUpdate);
  });

  it('returns null on web without logging', () => {
    expect(loadNative('web').loadWidgetUpdater()).toBeNull();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('returns null in Expo Go without touching the widget modules, logging once', () => {
    mockConstants.executionEnvironment = 'storeClient';
    const native = loadNative();

    expect(native.loadWidgetUpdater()).toBeNull();
    expect(native.loadWidgetUpdater()).toBeNull();
    expect(native.isWidgetRuntime()).toBe(false);
    expect(mockModules.requires).toBe(0);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('returns null and logs once when the native module fails to load', () => {
    mockModules.iosThrows = true;
    const native = loadNative();

    expect(native.loadWidgetUpdater()).toBeNull();
    expect(native.loadWidgetUpdater()).toBeNull();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('Home-screen widgets are unavailable in this build', expect.any(Error));
  });
});

describe('registerAndroidWidget', () => {
  it('registers the headless task handler on Android', () => {
    loadNative('android').registerAndroidWidget();
    expect(mockRegisterTaskHandler).toHaveBeenCalledTimes(1);
  });

  it('does nothing on iOS or web', () => {
    loadNative('ios').registerAndroidWidget();
    loadNative('web').registerAndroidWidget();
    expect(mockRegisterTaskHandler).not.toHaveBeenCalled();
  });

  it('does nothing in Expo Go, never loading the widget module', () => {
    mockConstants.executionEnvironment = 'storeClient';
    loadNative('android').registerAndroidWidget();
    expect(mockRegisterTaskHandler).not.toHaveBeenCalled();
    expect(mockModules.requires).toBe(0);
  });

  it('logs instead of crashing when the native module is missing', () => {
    mockModules.androidThrows = true;
    const native = loadNative('android');

    expect(() => native.registerAndroidWidget()).not.toThrow();
    expect(mockRegisterTaskHandler).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
