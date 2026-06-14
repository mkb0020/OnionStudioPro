// ENGINE/SPRITERENDERER.JS
//
// MULTI-TRACK SPRITE SHEET RENDERER.
// RENDERTRACK(CTX, TRACKID) RENDERS A SINGLE TRACK ONTO THE PROVIDED CTX,
// ALLOWING THE CALLER TO INTERPOSE EFFECT CHAINS BETWEEN TRACKS.

const uid = () => Math.random().toString(36).slice(2, 9);

export const DEFAULT_TRACK = {
  name: "Track 1",
  frames: [0],
  fps: 12,
  loop: true,
  opacity: 1,
  blendMode: "source-over",
  enabled: true,
  effects: [],
};

export class SpriteRenderer {
  constructor(cfg) {
    this.cfg = cfg;
    this.img = null;
    this.loaded = false;
    this._trackState = {};
    this._trackFinished = false;
    this._initTrackState();
    this.load();
  }

  _initTrackState() {
    (this.cfg.tracks || []).forEach((t) => {
      if (!this._trackState[t.id]) {
        this._trackState[t.id] = { frameIdx: 0, elapsed: 0 };
      }
    });
  }

  load() {
    if (!this.cfg.src) return;
    this.img = new Image();
    this.img.onload = () => (this.loaded = true);
    this.img.src = this.cfg.src;
  }

  update(dt) {
    // Reset finished flag each tick; set true below if any enabled non-looping
    // track reaches its last frame — consumed by CueTimeline via trackFinished getter.
    this._trackFinished = false;

    (this.cfg.tracks || []).forEach((track) => {
      if (!track.enabled) return;
      const frames = track.frames || [0];
      if (frames.length <= 1) return;
      const state = this._trackState[track.id];
      if (!state) return;
      state.elapsed += dt;
      const interval = 1000 / (track.fps || 12);
      if (state.elapsed >= interval) {
        state.elapsed = 0;
        const next = state.frameIdx + 1;
        if (next >= frames.length) {
          if (track.loop) {
            state.frameIdx = 0;
          } else {
            state.frameIdx = frames.length - 1;
            this._trackFinished = true; // non-looping track reached its last frame
          }
        } else {
          state.frameIdx = next;
        }
      }
    });
  }

  // ── CUE SYSTEM INTERFACE ──────────────────────────────────────────────────
  // Consumed by buildLayerSnapshot() in CueTimeline.js.
  // currentFrame returns the actual frame index of the first enabled track —
  // i.e. the sheet frame number, not the track's internal frameIdx — so cue
  // triggers can be authored in terms of the sprite sheet frame directly.

  get currentFrame() {
    const firstEnabled = (this.cfg.tracks || []).find((t) => t.enabled);
    if (!firstEnabled) return 0;
    const state = this._trackState[firstEnabled.id];
    if (!state) return 0;
    const frames = firstEnabled.frames || [0];
    return frames[Math.min(state.frameIdx, frames.length - 1)] ?? 0;
  }

  // True for one tick when any enabled non-looping track reaches its last frame.
  get trackFinished() {
    return this._trackFinished;
  }

  // RENDER A SINGLE TRACK'S CURRENT FRAME ONTO CTX.
  // CALLER IS RESPONSIBLE FOR OPACITY/BLENDMODE/COMPOSITING.
  renderTrack(ctx, track) {
    if (!this.loaded || !this.img) return;
    const { x = 0, y = 0, frameW = 64, frameH = 64, scale = 1 } = this.cfg;
    const frames = track.frames || [0];
    const state = this._trackState[track.id];
    if (!state) return;
    const frameIndex = frames[Math.min(state.frameIdx, frames.length - 1)];
    const cols = Math.max(1, Math.floor(this.img.width / frameW));
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    ctx.drawImage(
      this.img,
      col * frameW, row * frameH, frameW, frameH,
      x, y, frameW * scale, frameH * scale
    );
  }

  // RENDER A SINGLE TRACK WITH PHYSICS TRANSFORM APPLIED.
  // TRANSFORM: { X, Y, SCALEX, SCALEY, ROTATION } — ADDITIVE OFFSETS FROM PHYSICSDRIVER.
  renderTrackWithTransform(ctx, track, transform) {
    if (!this.loaded || !this.img) return;
    const { x = 0, y = 0, frameW = 64, frameH = 64, scale = 1 } = this.cfg;
    const frames = track.frames || [0];
    const state = this._trackState[track.id];
    if (!state) return;
    const frameIndex = frames[Math.min(state.frameIdx, frames.length - 1)];
    const cols = Math.max(1, Math.floor(this.img.width / frameW));
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);

    const tx  = transform?.x        ?? 0;
    const ty  = transform?.y        ?? 0;
    const sx  = transform?.scaleX   ?? 1;
    const sy  = transform?.scaleY   ?? 1;
    const rot = transform?.rotation ?? 0;

    const drawW  = frameW * scale * sx;
    const drawH  = frameH * scale * sy;
    // PIVOT AROUND THE SPRITE'S CENTER
    const pivotX = (x + tx) + (frameW * scale) / 2;
    const pivotY = (y + ty) + (frameH * scale) / 2;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(
      this.img,
      col * frameW, row * frameH, frameW, frameH,
      -drawW / 2, -drawH / 2, drawW, drawH
    );
    ctx.restore();
  }

  // LEGACY FULL RENDER — USED WHEN NO PER-TRACK EFFECTS ARE NEEDED.
  // COMPOSITES ALL TRACKS DIRECTLY ONTO CTX.
  render(ctx) {
    if (!this.loaded || !this.img) return;
    (this.cfg.tracks || []).forEach((track) => {
      if (!track.enabled) return;
      ctx.save();
      ctx.globalAlpha = track.opacity ?? 1;
      ctx.globalCompositeOperation = track.blendMode || "source-over";
      this.renderTrack(ctx, track);
      ctx.restore();
    });
  }
}