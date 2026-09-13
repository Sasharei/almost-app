import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/appBehavior";
import { loadInstallSecret } from "./installSecretStorage";

const pending = new Map();
export const ensurePremiumInstallSecret = installId => {
  if (!installId) return Promise.reject(new Error("install_id_required"));
  if (pending.has(installId)) return pending.get(installId);
  const operation = (async () => {
    // Hashing makes the key valid for SecureStore and scopes iOS Keychain data to this installation.
    const suffix = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, installId);
    const key = `almost.install-secret.${suffix}`;
    const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
    return loadInstallSecret({
      readSecure: () => SecureStore.getItemAsync(key, options),
      writeSecure: value => SecureStore.setItemAsync(key, value, options),
      readLegacy: () => AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_INSTALL_SECRET),
      removeLegacy: () => AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_INSTALL_SECRET),
      randomBytes: Crypto.getRandomBytesAsync,
    });
  })().finally(() => pending.delete(installId));
  pending.set(installId, operation);
  return operation;
};
