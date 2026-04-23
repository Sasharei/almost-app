export const SOUND_FILES = {
  coin: require("../../assets/sounds/coin.wav"),
  tap: require("../../assets/sounds/tap.wav"),
  counter: require("../../assets/sounds/counter.wav"),
  cat: require("../../assets/sounds/cat.wav"),
  challenge_accept: require("../../assets/sounds/challenge_accept.wav"),
  focus_accept: require("../../assets/sounds/focus_accept.wav"),
  reward: require("../../assets/sounds/reward.wav"),
  thunder: require("../../assets/sounds/thunder.wav"),
  daily_reward: require("../../assets/sounds/daily_reward.wav"),
  level_up: require("../../assets/sounds/challenge_accept.wav"),
  party_beat: require("../../assets/sounds/counter.wav"),
  party_clap: require("../../assets/sounds/tap.wav"),
  party_cheer: require("../../assets/sounds/reward.wav"),
};

export const PRELOAD_SOUND_KEYS = new Set(["coin", "tap", "counter", "level_up"]);

export const SOUND_COOLDOWNS = {
  coin: 200,
  tap: 120,
  counter: 60,
  cat: 600,
  challenge_accept: 500,
  focus_accept: 500,
  reward: 600,
  thunder: 900,
  daily_reward: 900,
  level_up: 1200,
  party_beat: 60,
  party_clap: 80,
  party_cheer: 600,
};

const SOUND_VOLUME_FACTOR = 0.7;

export const SOUND_VOLUMES = {
  coin: 0.85 * SOUND_VOLUME_FACTOR,
  tap: 0.75 * SOUND_VOLUME_FACTOR,
  counter: 1.0 * SOUND_VOLUME_FACTOR,
  cat: 0.8 * SOUND_VOLUME_FACTOR,
  challenge_accept: 0.85 * SOUND_VOLUME_FACTOR,
  focus_accept: 0.85 * SOUND_VOLUME_FACTOR,
  reward: 0.9 * SOUND_VOLUME_FACTOR,
  thunder: 0.85 * SOUND_VOLUME_FACTOR,
  daily_reward: 0.9 * SOUND_VOLUME_FACTOR,
  level_up: 0.9 * SOUND_VOLUME_FACTOR,
  party_beat: 0.95 * SOUND_VOLUME_FACTOR,
  party_clap: 0.8 * SOUND_VOLUME_FACTOR,
  party_cheer: 0.85 * SOUND_VOLUME_FACTOR,
};

export const ANDROID_SOUND_MIN_GAP_MS = 120;
export const ANDROID_SOUND_KEY_GUARD_MS = 90;
