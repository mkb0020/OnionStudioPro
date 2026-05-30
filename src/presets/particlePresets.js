export const PARTICLE_PRESETS = {
  stars: {
    name: "Stars",
    config: { count: 80, speedX: 0.3, speedY: 0.8, size: 1.5, color: "#c4b5fd" },
  },
  dust: {
    name: "Dust",
    config: { count: 60, speedX: 0.8, speedY: 0.3, size: 2.5, color: "#fad0c4" },
  },
  rain: {
    name: "Rain",
    config: { count: 120, speedX: 0.5, speedY: 6, size: 1, color: "#67FEBD" },
  },
  embers: {
    name: "Embers",
    config: { count: 50, speedX: 1.2, speedY: 1.5, size: 2, color: "#ff6200" },
  },
  sparkle: {
    name: "Sparkle",
    config: { count: 40, speedX: 0.5, speedY: 0.5, size: 3, color: "#fecd39" },
  },
};

export const DEFAULT_PARTICLE = {
  count: 80,
  speedX: 0.3,
  speedY: 0.8,
  size: 1.5,
  color: "#A55AFF",
};

export const DEFAULT_SPRITE = {
  src: "",
  frameW: 64,
  frameH: 64,
  x: 0,
  y: 0,
  scale: 1,
  tracks: [
    {
      id: "default",
      name: "Track 1",
      frames: [0],
      fps: 12,
      loop: true,
      opacity: 1,
      blendMode: "source-over",
      enabled: true,
    },
  ],
};