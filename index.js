import { registerRootComponent } from "expo";
import { Text, TextInput } from "react-native";
import App from "./App";

const applyFixedFontScaling = () => {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;
};

applyFixedFontScaling();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
