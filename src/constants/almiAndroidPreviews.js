// Correct density metadata keeps Android Resources from upscaling a mdpi image
// to a multi-megabyte loading drawable on old, small Java heaps.
export const ALMI_ANDROID_PREVIEWS = {
  classic: require("../../assets/almi_android_previews/classic.png"),
  green: require("../../assets/almi_android_previews/green.png"),
  teal: require("../../assets/almi_android_previews/teal.png"),
  yellow: require("../../assets/almi_android_previews/yellow.png"),
  purple: require("../../assets/almi_android_previews/purple.png"),
};
