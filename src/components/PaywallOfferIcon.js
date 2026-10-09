import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";

// Small geometric interface icons, shared by the offer, benefits and controls.
const PaywallOfferIcon = ({ name, color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {name === "insights" ? <><Rect x={4} y={14} width={3} height={6} rx={1} /><Rect x={10} y={9} width={3} height={11} rx={1} /><Rect x={16} y={4} width={3} height={16} rx={1} /></> : null}
    {name === "calendar" ? <><Rect x={4} y={5} width={16} height={15} rx={3} /><Path d="M8 3v4M16 3v4M4 10h16" /></> : null}
    {name === "cards" ? <><Rect x={3} y={5} width={18} height={14} rx={3} /><Path d="M3 10h18M7 15h3" /></> : null}
    {name === "shield" ? <><Path d="M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6z" /><Path d="m8 12 3 3 5-6" /></> : null}
    {name === "check" ? <Path d="m6 12 4 4 8-8" /> : null}
    {name === "right" ? <Path d="m9 6 6 6-6 6" /> : null}
    {name === "up" ? <Path d="m6 15 6-6 6 6" /> : null}
    {name === "close" ? <Path d="m7 7 10 10M17 7 7 17" /> : null}
    {name === "radio" ? <Circle cx={12} cy={12} r={8} /> : null}
  </Svg>
);
export default PaywallOfferIcon;
