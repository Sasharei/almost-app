// Simulator-only regression fixture. Renders the real component and native transport.
// Does not send requests, change consent, seed purchases or initialize analytics.
import React, { useState } from 'react';
import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ScrollView, Pressable, LogBox, NativeModules } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CloudDeletionRow } from '../../src/privacy/CloudDeletionRow';
import { TRANSLATIONS } from '../../src/constants/translations';
import { THEMES, PRO_THEME_ACCENT_OPTIONS } from '../../src/constants/themeConfig';
LogBox.ignoreAllLogs(true);
function App() {
  const [mode, setMode] = useState('light'); const [count, setCount] = useState(0);
  const option = PRO_THEME_ACCENT_OPTIONS.find(o => o.id === mode);
  const colors = option ? { ...THEMES.pro, ...option.palette, primary: option.accent, onPrimary: option.onAccent } : THEMES[mode];
  return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider><View style={{flex:1,backgroundColor:colors.background,paddingTop:60,paddingBottom:40}}>
    <Text style={{color:colors.text,fontSize:20,textAlign:'center'}}>QA / {mode} / taps {count}</Text>
    <Text style={{color:colors.text}}>{NativeModules.AlmostPrivacySharing ? "Native iOS share available" : "Legacy iOS share"}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',padding:4}}>{['light','dark',...PRO_THEME_ACCENT_OPTIONS.map(o=>o.id)].map(m=><Pressable testID={`qa-theme-${m}`} key={m} onPress={()=>setMode(m)} style={{padding:12,minWidth:88,minHeight:44}}><Text style={{color:colors.text}}>{m}</Text></Pressable>)}</View>
    <ScrollView testID="qa-scroll" style={{flex:1}}><Pressable testID="qa-tap" onPress={()=>setCount(n=>n+1)} style={{padding:24,backgroundColor:colors.primary}}><Text style={{color:colors.onPrimary}}>Top action {count}</Text></Pressable>
      <CloudDeletionRow t={key=>TRANSLATIONS.ru[key]||key} colors={colors}/>
      {Array.from({length:20},(_,i)=><View key={i} style={{padding:22,borderBottomWidth:1,borderColor:colors.border}}><Text style={{color:colors.text}}>Scroll marker {i+1}</Text></View>)}
      <Pressable onPress={()=>setCount(n=>n+1)} style={{padding:24,backgroundColor:colors.primary}}><Text style={{color:colors.onPrimary}}>Bottom action {count}</Text></Pressable>
    </ScrollView></View></SafeAreaProvider></GestureHandlerRootView>;
}
registerRootComponent(App);
