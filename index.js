import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./App";
import { initAttribution, setAppScopedInstallIdentity } from "./analytics";
import { ensurePremiumInstallId } from "./src/analytics/installIdentity";
// Shared with executable attribution tests so consent/ATT can never gate startup order.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { bootstrapAppsFlyerAttribution } = require("./src/analytics/appsFlyerBootstrap");

const bootstrapAttribution = () =>
  bootstrapAppsFlyerAttribution({
    ensureInstallId: ensurePremiumInstallId,
    setInstallIdentity: setAppScopedInstallIdentity,
    initAttribution,
  });

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
void bootstrapAttribution()
  .catch((error) => {
    console.warn("AppsFlyer attribution bootstrap failed", error);
  });

registerRootComponent(App);
