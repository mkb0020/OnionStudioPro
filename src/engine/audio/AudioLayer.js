// ENGINE/AUDIO/AUDIOLAYER.JS
//
// AUDIO PLAYBACK ENGINE FOR AUDIO LAYERS.
// Manages a pool of HTMLAudioElement clones so rapid cue firing
// (e.g. a looping sprite hitting frame 13 every cycle) doesn't cut off
// a still-playing sound — each trigger gets its own clone from the pool.
//
// CONFIG SHAPE (layer.config):
// {
//   src:          string,   // path or blob URL  e.g. "public/audio/boom.m4a"
//   volume:       0–1,      // default 0.8
//   playbackRate: 0.5–4,    // default 1.0
//   loop:         bool,     // loop the clip (ignores pool — single element)
//   cueId:        string,   // scene cue ID that triggers playback
//   poolSize:     1–8,      // max simultaneous instances (default 3)
// }

export const BUILT_IN_SOUNDS = [
  { label: "💥 Boom",          src: "public/audio/boom.m4a" },
  { label: "🔫 Laser",         src: "public/audio/laser.m4a" },
  { label: "🫧 Bloop",         src: "public/audio/bloop.m4a" },
  { label: "🔔 Ding",          src: "public/audio/ding.m4a" },
  { label: "😤 Growl",         src: "public/audio/growl.m4a" },
  { label: "💨 Woosh",         src: "public/audio/woosh.m4a" },
  { label: "⬆️ Power Up",      src: "public/audio/powerup.m4a" },
  { label: "📺 Static",        src: "public/audio/static.m4a" },
  { label: "🫧 Pop",           src: "public/audio/pop.m4a" },
  { label: "🤕 Ouch",          src: "public/audio/ouch.m4a" },
  { label: "💦 Splat",         src: "public/audio/splat.m4a" },
  { label: "🚨 Alarm",         src: "public/audio/alarm.m4a" },
  { label: "🦗 Creepy Chirp",  src: "public/audio/creepyChirp.m4a" },
  { label: "🌀 Whirl",         src: "public/audio/whirl.m4a" },
];

export const DEFAULT_AUDIO_CONFIG = {
  src:          "",
  volume:       0.8,
  playbackRate: 1.0,
  loop:         false,
  cueId:        "",
  poolSize:     3,
};

export class AudioLayer {
  constructor(cfg) {
    this.cfg       = { ...DEFAULT_AUDIO_CONFIG, ...cfg };
    this._pool     = [];       // HTMLAudioElement pool
    this._poolIdx  = 0;        // round-robin cursor
    this._unsub    = null;     // cue unsubscribe fn
    this._buildPool();
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  /** Update config (called when layer.config changes in React state). */
  updateConfig(cfg) {
    const srcChanged  = cfg.src  !== this.cfg.src;
    const sizeChanged = (cfg.poolSize ?? 3) !== this.cfg.poolSize;
    this.cfg = { ...DEFAULT_AUDIO_CONFIG, ...cfg };
    if (srcChanged || sizeChanged) this._buildPool();
    else this._applyParamsToPool();
  }

  /**
   * Subscribe to a cue. Call whenever cueId or the timeline instance changes.
   * Automatically unsubscribes from any previous cue first.
   */
  attachCue(cueTimeline) {
    this._detachCue();
    if (!cueTimeline || !this.cfg.cueId) return;
    this._unsub = cueTimeline.on(this.cfg.cueId, () => this.play());
  }

  /** Unsubscribe from cue without destroying the pool. */
  _detachCue() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  /** Play immediately (also called by cue listener). */
  play() {
    if (!this.cfg.src || this._pool.length === 0) return;
    if (this.cfg.loop) {
      // Looping: use a single dedicated element, restart from beginning
      const el = this._pool[0];
      el.currentTime = 0;
      el.play().catch(() => {}); // suppress autoplay policy errors silently
      return;
    }
    // Non-looping: round-robin through the pool so overlapping plays work
    const el = this._pool[this._poolIdx];
    this._poolIdx = (this._poolIdx + 1) % this._pool.length;
    el.currentTime = 0;
    el.play().catch(() => {});
  }

  /** Stop all playing instances. */
  stop() {
    for (const el of this._pool) {
      el.pause();
      el.currentTime = 0;
    }
  }

  /** Full teardown — call when layer is deleted. */
  dispose() {
    this._detachCue();
    this.stop();
    this._pool = [];
  }

  // ── INTERNAL ───────────────────────────────────────────────────────────────

  _buildPool() {
    this.stop();
    this._pool = [];
    this._poolIdx = 0;
    if (!this.cfg.src) return;
    const size = this.cfg.loop ? 1 : Math.max(1, Math.min(8, this.cfg.poolSize ?? 3));
    for (let i = 0; i < size; i++) {
      const el = new Audio(this.cfg.src);
      el.volume       = Math.max(0, Math.min(1, this.cfg.volume ?? 0.8));
      el.playbackRate = Math.max(0.5, Math.min(4, this.cfg.playbackRate ?? 1.0));
      el.loop         = !!this.cfg.loop;
      el.preload      = "auto";
      this._pool.push(el);
    }
  }

  _applyParamsToPool() {
    for (const el of this._pool) {
      el.volume       = Math.max(0, Math.min(1, this.cfg.volume ?? 0.8));
      el.playbackRate = Math.max(0.5, Math.min(4, this.cfg.playbackRate ?? 1.0));
      el.loop         = !!this.cfg.loop;
    }
  }
}