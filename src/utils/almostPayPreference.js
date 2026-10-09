import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'almost.pay.screenOnly.v1';
let screenOnly = false;
let hydration;
const listeners = new Set();
export function subscribeAlmostPayPreference(listener) {
  listeners.add(listener);
  listener(screenOnly);
  hydration ||= AsyncStorage.getItem(KEY).then((value) => {
    screenOnly = screenOnly || value === '1';
    listeners.forEach((notify) => notify(screenOnly));
  });
  return { ready: hydration, unsubscribe: () => listeners.delete(listener) };
}
export async function disableAlmostPayBiometrics() {
  // Persist before telling the user this choice applies to future confirmations.
  await AsyncStorage.setItem(KEY, '1');
  screenOnly = true;
  listeners.forEach((notify) => notify(true));
}
