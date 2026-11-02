import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";

const LEGACY_ANDROID = Platform.OS === "android" && Number(Platform.Version) <= 25;

const SOFT_ROOM = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_soft_room.webp") : require("../../assets/almi_room/soft_room.webp");
const OBSERVATORY = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_observatory.webp") : require("../../assets/almi_room/observatory.webp");
const GARDEN = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_garden.webp") : require("../../assets/almi_room/garden.webp");
const BED = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_bed.webp") : require("../../assets/almi_room/bed.webp");
const BOWL = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_bowl.webp") : require("../../assets/almi_room/bowl.webp");
const RUG = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_rug.webp") : require("../../assets/almi_room/rug.webp");
const WINDOW = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_window.webp") : require("../../assets/almi_room/window.webp");
const SHELF = LEGACY_ANDROID ? require("../../assets/almi_android_previews/room_shelf.webp") : require("../../assets/almi_room/shelf.webp");
export const ALMI_ROOM_ITEM_IMAGES = { bed: BED, bowl: BOWL, rug: RUG, window: WINDOW, shelf: SHELF, observatory: OBSERVATORY, garden: GARDEN };

const PLACEMENTS = [
  { id: "window", source: WINDOW, style: { top: "5%", right: "7%", width: "30%", height: "39%" } },
  { id: "shelf", source: SHELF, style: { top: "10%", left: "2%", width: "39%", height: "29%" } },
  { id: "rug", source: RUG, style: { bottom: "1%", left: "12%", width: "76%", height: "30%" } },
  { id: "bed", source: BED, style: { bottom: "3%", left: "2%", width: "43%", height: "29%" } },
  { id: "bowl", source: BOWL, style: { bottom: "8%", right: "3%", width: "25%", height: "24%" } },
];
const FLOOR_ITEM_IDS = new Set(["rug", "bed", "bowl"]);

export default function AlmiRoomDecor({ equipped = {}, previewItemId = null, scene = "preview" }) {
  const backgroundId = previewItemId === "observatory" || previewItemId === "garden" ? previewItemId : equipped.background;
  return (
    <View pointerEvents="none" accessible={false} style={styles.fill}>
      {scene !== "careFloor" && (
        <Image
          testID="almi-room-background"
          source={backgroundId === "observatory" ? OBSERVATORY : backgroundId === "garden" ? GARDEN : SOFT_ROOM}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={0}
          style={styles.background}
        />
      )}
      {PLACEMENTS.map((placement) => {
        if (equipped[placement.id] !== placement.id && previewItemId !== placement.id) return null;
        if (scene === "care" && FLOOR_ITEM_IDS.has(placement.id)) return null;
        if (scene === "careFloor" && !FLOOR_ITEM_IDS.has(placement.id)) return null;
        return (
          <Image
            key={placement.id}
            testID={`almi-room-${placement.id}`}
            source={placement.source}
            resizeMode="contain"
            resizeMethod="resize"
            fadeDuration={0}
            style={[styles.item, scene === "careFloor" ? FLOOR_PLACEMENTS[placement.id] : scene === "care" ? CARE_WALL_PLACEMENTS[placement.id] : placement.style]}
          />
        );
      })}
    </View>
  );
}

const CARE_WALL_PLACEMENTS = {
  window: { top: "12%", right: "6%", width: "25%", height: "29%" },
  shelf: { top: "14%", left: "2%", width: "27%", height: "21%" },
};

// The floor layer ends above the room controls and moves with the animated cat.
const FLOOR_PLACEMENTS = {
  rug: { bottom: "2%", left: "20%", width: "60%", height: "30%" },
  bed: { bottom: "6%", left: "0%", width: "34%", height: "32%" },
  bowl: { bottom: "7%", right: "0%", width: "19%", height: "26%" },
};

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  background: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  item: { position: "absolute" },
});
