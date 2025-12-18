import NativeJSLogger from './NativeJSLogger';
import Platform from '../Platform';
import { CodedError } from '../errors/CodedError';

type LogListener = {
  action: (...data: any[]) => void;
  eventName: string;
};

type NativeLoggerModule = {
  addListener: (eventName: string, listener: (payload: { message: string }) => void) => void;
} | null;

const resolveNativeLogger = (): NativeLoggerModule => {
  if (!NativeJSLogger) {
    return null;
  }

  if (typeof NativeJSLogger.addListener === 'function') {
    return NativeJSLogger as NativeLoggerModule;
  }

  const possibleInteropLogger = (NativeJSLogger as { default?: NativeLoggerModule }).default;
  if (possibleInteropLogger && typeof possibleInteropLogger.addListener === 'function') {
    return possibleInteropLogger;
  }

  return null;
};

const resolvedNativeLogger = resolveNativeLogger();
const isNativeRuntime = Platform.OS === 'android' || Platform.OS === 'ios';
const canWireNativeLogger = __DEV__ && isNativeRuntime && resolvedNativeLogger !== null;

if (canWireNativeLogger && resolvedNativeLogger) {
  const onNewException: LogListener = {
    eventName: 'ExpoModulesCoreJSLogger.onNewError',
    action: console.error,
  };

  const onNewWarning: LogListener = {
    eventName: 'ExpoModulesCoreJSLogger.onNewWarning',
    action: console.warn,
  };

  const onNewDebug: LogListener = {
    eventName: 'ExpoModulesCoreJSLogger.onNewDebug',
    action: console.debug,
  };

  const onNewInfo: LogListener = {
    eventName: 'ExpoModulesCoreJSLogger.onNewInfo',
    action: console.info,
  };

  const onNewTrace: LogListener = {
    eventName: 'ExpoModulesCoreJSLogger.onNewTrace',
    action: console.trace,
  };

  const listeners: LogListener[] = [
    onNewException,
    onNewWarning,
    onNewDebug,
    onNewInfo,
    onNewTrace,
  ];

  for (const listener of listeners) {
    try {
      resolvedNativeLogger.addListener(listener.eventName, ({ message }: { message: string }) => {
        listener.action(message);
      });
    } catch (error) {
      console.warn(
        '[expo-modules-core] Failed to connect ExpoModulesCoreJSLogger listener:',
        (error as Error)?.message ?? error
      );
      break;
    }
  }
} else if (__DEV__ && isNativeRuntime && NativeJSLogger) {
  console.warn(
    '[expo-modules-core] ExpoModulesCoreJSLogger is present but addListener is unavailable. Skipping JS logging bridge.'
  );
}

declare namespace globalThis {
  let ExpoModulesCore_CodedError: undefined | typeof CodedError;
}

// We have to export `CodedError` via global object to use in later in the C++ code.
globalThis.ExpoModulesCore_CodedError = CodedError;
