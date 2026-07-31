import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/appBehavior";

export const createPremiumInstallId = () => {
  const cryptoApi = globalThis?.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `m_${cryptoApi.randomUUID()}`;
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    try {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      const randomHex = Array.from(bytes, (value) =>
        value.toString(16).padStart(2, "0")
      ).join("");
      return `m_${randomHex}`;
    } catch (_error) {}
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
};

export const ensurePremiumInstallId = async () => {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_INSTALL_ID);
  const normalizedStoredValue =
    typeof storedValue === "string" ? storedValue.trim() : "";
  if (normalizedStoredValue) return normalizedStoredValue;
  const createdValue = createPremiumInstallId();
  await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_INSTALL_ID, createdValue);
  return createdValue;
};
