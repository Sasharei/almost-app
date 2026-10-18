import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

// Concept illustrations, not screenshots or a promise of populated account data.
// Labels and colors come from the same dictionaries and theme as the actual app.
export default function PremiumStoryArtwork({ storyId, colors, t, height }) {
  const ink = colors.primary || colors.text;
  const muted = colors.border;
  if (storyId === "welcome" || storyId === "ready") {
    return (
      <View style={[styles.mascot, { height }]} pointerEvents="none" accessible={false}>
        <Image source={require("../../assets/Cat_mascot.png")} style={{ width: height, height }} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={[styles.diagram, { minHeight: height, backgroundColor: colors.surfaceMuted }]} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={Math.max(72, height - (storyId === "budget" ? 60 : 24))} viewBox="0 0 320 150" fill="none">
        {storyId === "budget" ? <>
          <Path d="M59 62h72M189 62h72M122 54l9 8-9 8M252 54l9 8-9 8" stroke={muted} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M24 46l18-14 18 14M28 46h28v33H28zM37 60h10v19" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <Rect x="143" y="27" width="34" height="69" rx="8" stroke={ink} strokeWidth="3" />
          <Line x1="154" y1="35" x2="166" y2="35" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="160" cy="84" r="2" fill={ink} />
          <Path d="M270 45h31v39h-31zM277 37h17v8M277 57h17M277 66h11" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M21 110h278" stroke={muted} strokeWidth="2" />
        </> : storyId === "insights" ? <>
          <Rect x="50" y="14" width="220" height="122" rx="12" stroke={muted} strokeWidth="2" />
          <Path d="M72 112h176M72 112V38" stroke={muted} strokeWidth="2" strokeLinecap="round" />
          <Path d="M88 91l34-19 34 10 34-31 42-13" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {[ [88,91], [122,72], [156,82], [190,51], [232,38] ].map(([cx,cy]) => <Circle key={cx} cx={cx} cy={cy} r="4" fill={ink} />)}
        </> : storyId === "impulse" ? <>
          {[0,1,2,3,4,5,6].map((column) => [0,1,2].map((row) => <Rect key={`${column}-${row}`} x={48 + column * 33} y={27 + row * 34} width="25" height="25" rx="6" fill={((column + row * 3) % 5) < 2 ? ink : muted} opacity={((column + row * 3) % 5) < 2 ? 0.8 : 0.6} />))}
        </> : <>
          {[66,138,210].map((x,index) => <React.Fragment key={x}>
            <Rect x={x} y={32 + index * 6} width="48" height="75" rx="10" stroke={index === 1 ? ink : muted} strokeWidth="3" />
            <Circle cx={x+24} cy={57+index*6} r="8" stroke={ink} strokeWidth="2" />
            <Path d={`M${x+12} ${83+index*6}h24M${x+12} ${92+index*6}h16`} stroke={muted} strokeWidth="3" strokeLinecap="round" />
          </React.Fragment>)}
        </>}
      </Svg>
      {storyId === "budget" ? <View style={styles.labels}>
        <Text maxFontSizeMultiplier={1.2} style={[styles.label,{color:colors.text}]}>{t("budgetSavingsTab")}</Text>
        <Text maxFontSizeMultiplier={1.2} style={[styles.label,{color:colors.text}]}>{t("budgetDebtTab")}</Text>
      </View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  mascot: { alignItems:"center", justifyContent:"center" },
  diagram: { borderRadius:16, padding:12, justifyContent:"center", width:"100%" },
  labels: { flexDirection:"row", gap:16, justifyContent:"space-around" },
  label: { flex:1, fontSize:14, fontWeight:"600", textAlign:"center" },
});
