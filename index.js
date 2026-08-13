import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./App";
import { initAttribution, setAppScopedInstallIdentity } from "./analytics";
import { ensurePremiumInstallId } from "./src/analytics/installIdentity";

const bootstrapAttribution = async () => {
  const premiumInstallId = await ensurePremiumInstallId();
  await setAppScopedInstallIdentity(premiumInstallId);
  void initAttribution().catch((error) => {
    console.warn("AppsFlyer initialization failed", error);
  });
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
void bootstrapAttribution()
  .catch((error) => {
    console.warn("AppsFlyer attribution bootstrap failed", error);
  });

registerRootComponent(App);
