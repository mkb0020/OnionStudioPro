// ENGINE/CUES/CUETIMELINE.JS
//
// SCENE-LEVEL CUE SYSTEM — evaluates trigger conditions each frame and fires
// registered callbacks when a cue trips.
//
// ── CONCEPTS ────────────────────────────────────────────────────────────────
//
//  CUE — a named event with a trigger condition:
//    { id, label, trigger: { type, ...params } }
//
//  TRIGGER TYPES:
//    spriteFrame  — fires when a specific sprite layer reaches a specific frame
//                   { type: "spriteFrame", layerId, frame }
//    time         — fires once at a specific elapsed ms since timeline start
//                   { type: "time", ms }
//    layerFinished — fires when a sprite layer's active track has completed
//                    one full cycle (non-looping tracks only)
//                   { type: "layerFinished", layerId }
//    manual       — never fires automatically; triggered by calling .fire(cueId)
//                   { type: "manual" }
//
//  LISTENER — a callback registered for a cue ID:
//    timeline.on("door-slam", (cue) => { ... })
//    timeline.off("door-slam", fn)
//
// ── USAGE IN RENDER LOOP ─────────────────────────────────────────────────────
//
//   // Once per frame, before rendering layers:
//   cueTimeline.tick(dt, layerFrameSnapshot);
//
//   // layerFrameSnapshot is a plain object you build from current layer state:
//   // { [layerId]: { currentFrame, trackFinished } }
//
// ── SCENE DATA MODEL ─────────────────────────────────────────────────────────
//
//   scene.cues = [
//     { id: "door-slam", label: "Door Slam", trigger: { type: "spriteFrame", layerId: "abc", frame: 13 } },
//     { id: "intro-end", label: "Intro End",  trigger: { type: "time", ms: 3000 } },
//   ]
//
//   // Layers reference cues by ID, not by direct layer coupling:
//   layer.config.cueId = "door-slam"
//
// ── NOTES ────────────────────────────────────────────────────────────────────
//
//   spriteFrame triggers re-arm each loop cycle so they fire on every pass
//   through the target frame, not just the first. Set rearmsOnLoop: false in
//   the trigger to fire only once (useful for one-shot cutscene events).
//
//   time triggers fire once only and do not re-arm.
//
//   CueTimeline is stateless with respect to layer rendering — it never
//   touches canvases or contexts.

export class CueTimeline {
  constructor() {
    this._cues      = [];      // array of cue config objects (source of truth from scene)
    this._listeners = {};      // cueId → Set of callback fns
    this._state     = {};      // per-cue runtime state { armed, lastFrame, firedAt }
    this._elapsed   = 0;       // total ms since timeline was last reset
    this._running   = true;
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  /** Replace the full cue list (call when scene.cues changes). */
  setCues(cues) {
    this._cues = cues || [];
    // Clean up state for cues that no longer exist
    const activeIds = new Set(this._cues.map((c) => c.id));
    for (const id of Object.keys(this._state)) {
      if (!activeIds.has(id)) delete this._state[id];
    }
    // Initialise state for new cues
    for (const cue of this._cues) {
      if (!this._state[cue.id]) {
        this._state[cue.id] = this._initState(cue);
      }
    }
  }

  /** Reset elapsed time (e.g. when the user hits "restart preview"). */
  reset() {
    this._elapsed = 0;
    for (const cue of this._cues) {
      this._state[cue.id] = this._initState(cue);
    }
  }

  pause()  { this._running = false; }
  resume() { this._running = true;  }

  // ── LISTENERS ──────────────────────────────────────────────────────────────

  /**
   * Register a callback for a cue.
   * The callback receives the cue config object when fired.
   * Returns an unsubscribe function for convenience.
   *
   * @param {string}   cueId
   * @param {Function} fn  — called as fn(cue)
   */
  on(cueId, fn) {
    if (!this._listeners[cueId]) this._listeners[cueId] = new Set();
    this._listeners[cueId].add(fn);
    return () => this.off(cueId, fn);
  }

  /** Remove a specific callback for a cue. */
  off(cueId, fn) {
    this._listeners[cueId]?.delete(fn);
  }

  /** Remove all callbacks for a cue (or all cues if no id given). */
  offAll(cueId) {
    if (cueId) {
      delete this._listeners[cueId];
    } else {
      this._listeners = {};
    }
  }

  // ── MANUAL TRIGGER ─────────────────────────────────────────────────────────

  /**
   * Manually fire a cue by ID regardless of its trigger type.
   * Useful for "manual" trigger type cues and for testing.
   */
  fire(cueId) {
    const cue = this._cues.find((c) => c.id === cueId);
    if (cue) this._dispatch(cue);
  }

  // ── TICK ───────────────────────────────────────────────────────────────────

  /**
   * Call once per frame from the render loop BEFORE drawing layers.
   *
   * @param {number} dt   — delta time in ms since last frame
   * @param {Object} snapshot — map of layerId → { currentFrame, trackFinished }
   *   Build this from your layer/SpriteRenderer state, e.g.:
   *   { "abc123": { currentFrame: 7, trackFinished: false } }
   */
  tick(dt, snapshot = {}) {
    if (!this._running) return;
    this._elapsed += dt;

    for (const cue of this._cues) {
      const s = this._state[cue.id];
      if (!s || s.done) continue;

      const { trigger } = cue;
      if (!trigger) continue;

      switch (trigger.type) {

        case "spriteFrame": {
          const layerSnap = snapshot[trigger.layerId];
          if (!layerSnap) break;

          const targetFrame = trigger.frame ?? 0;
          const cur = layerSnap.currentFrame;
          const prev = s.lastFrame ?? cur;

          // Detect the moment we arrive at or cross the target frame
          const crossed = (prev < targetFrame && cur >= targetFrame)
                       || (prev > cur && cur <= targetFrame); // loop wrap

          let firedThisTick = false;
          if (crossed && s.armed) {
            this._dispatch(cue);
            s.armed = false;
            firedThisTick = true;
          }

          // Re-arm when the frame counter wraps (sprite looped).
          // firedThisTick guard prevents re-arming in the same tick we just fired
          // (catches the edge case where targetFrame === 0).
          if (!firedThisTick && prev !== null && prev > cur && trigger.rearmsOnLoop !== false) {
            s.armed = true;
          }

          s.lastFrame = cur;
          break;
        }

        case "time": {
          const targetMs = trigger.ms ?? 0;
          if (!s.fired && this._elapsed >= targetMs) {
            this._dispatch(cue);
            s.fired = true;
            s.done  = true; // time triggers fire once
          }
          break;
        }

        case "layerFinished": {
          const layerSnap = snapshot[trigger.layerId];
          if (!layerSnap) break;
          if (layerSnap.trackFinished && s.armed) {
            this._dispatch(cue);
            s.armed = false; // fire once per finished event; re-arm when track restarts
          }
          // Re-arm when track loops/restarts (trackFinished goes false again)
          if (!layerSnap.trackFinished && !s.armed) {
            s.armed = true;
          }
          break;
        }

        case "manual":
          // Never auto-fires — only via .fire(cueId)
          break;

        default:
          console.warn(`[CueTimeline] Unknown trigger type: "${trigger.type}" on cue "${cue.id}"`);
      }
    }
  }

  // ── INTERNAL ───────────────────────────────────────────────────────────────

  _initState(cue) {
    return {
      armed:     true,
      lastFrame: null,
      fired:     false,
      done:      false,
      firedAt:   null,
    };
  }

  _dispatch(cue) {
    const s = this._state[cue.id];
    if (s) s.firedAt = this._elapsed;

    const listeners = this._listeners[cue.id];
    if (!listeners || listeners.size === 0) return;
    for (const fn of listeners) {
      try {
        fn(cue);
      } catch (err) {
        console.error(`[CueTimeline] Listener error on cue "${cue.id}":`, err);
      }
    }
  }
}


// ── SNAPSHOT HELPERS ─────────────────────────────────────────────────────────
//
// Call buildLayerSnapshot(layers, systemsRef) in your render loop to produce
// the snapshot object that tick() expects.
//
// SpriteRenderer needs to expose currentFrame per track. If it doesn't yet,
// see the note below about the minimal addition needed.

/**
 * Build the snapshot object for tick() from current layer + renderer state.
 *
 * @param {Array}  layers      — current layers array (from layersRef.current)
 * @param {Object} systemsRef  — ref containing { [layerId]: SpriteRenderer | ParticleSystem }
 * @returns {Object}  { [layerId]: { currentFrame, trackFinished } }
 */
export function buildLayerSnapshot(layers, systemsRef) {
  const snapshot = {};
  for (const layer of layers) {
    if (layer.type !== "sprite") continue;
    const sys = systemsRef[layer.id];
    if (!sys) continue;

    // SpriteRenderer should expose currentFrame (the active frame index across
    // all tracks, or per-track via trackState). We use the first enabled track
    // as the primary signal — sufficient for most cue use cases.
    //
    // If SpriteRenderer doesn't yet have a currentFrame getter, add this to it:
    //   get currentFrame() { return this._frame ?? 0; }
    //   get trackFinished() { return this._trackFinished ?? false; }
    //
    // Or expose per-track state via trackState map if you need multi-track cues.

    snapshot[layer.id] = {
      currentFrame:  sys.currentFrame  ?? 0,
      trackFinished: sys.trackFinished ?? false,
    };
  }
  return snapshot;
}