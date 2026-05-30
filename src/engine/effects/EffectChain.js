// ENGINE/EFFECTS/EFFECTCHAIN.JS

import { GlitchEffect }   from "./GlitchEffect";
import { HueShiftEffect } from "./HueShiftEffect";
import { InvertEffect }   from "./InvertEffect";

const EFFECT_REGISTRY = {
  glitch:   GlitchEffect,
  hueShift: HueShiftEffect,
  invert:   InvertEffect,
};

export class EffectChain {
  constructor(canvasW, canvasH) {
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = canvasW;
    this.offscreen.height = canvasH;
    this.offCtx = this.offscreen.getContext("2d");

    this._buf = document.createElement("canvas");
    this._buf.width = canvasW;
    this._buf.height = canvasH;
    this._bufCtx = this._buf.getContext("2d");

    this._effects = {};
  }

  resize(w, h) {
    this.offscreen.width = w;
    this.offscreen.height = h;
    this._buf.width = w;
    this._buf.height = h;
  }

  _syncEffects(effectConfigs) {
    const activeTypes = new Set(effectConfigs.map((e) => e.type));
    for (const type of Object.keys(this._effects)) {
      if (!activeTypes.has(type)) delete this._effects[type];
    }
    for (const cfg of effectConfigs) {
      if (!this._effects[cfg.type] && EFFECT_REGISTRY[cfg.type]) {
        this._effects[cfg.type] = new EFFECT_REGISTRY[cfg.type]();
      }
    }
  }

  apply(mainCtx, mainCanvas, layerEffects, dt, renderFn) {
    if (!layerEffects || layerEffects.length === 0) {
      renderFn(mainCtx);
      return;
    }

    this._syncEffects(layerEffects);

    this.offCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
    renderFn(this.offCtx);

    let src    = this.offscreen;
    let srcCtx = this.offCtx;
    let dst    = this._buf;
    let dstCtx = this._bufCtx;

    for (const cfg of layerEffects) {
      const fx = this._effects[cfg.type];
      if (!fx) continue;
      dstCtx.clearRect(0, 0, dst.width, dst.height);
      dstCtx.drawImage(src, 0, 0);
      fx.apply(dstCtx, dst, cfg, dt);
      [src, srcCtx, dst, dstCtx] = [dst, dstCtx, src, srcCtx];
    }

    mainCtx.drawImage(src, 0, 0);
  }
}

// ─── TRACKEFFECTCHAINS ────────────────────────────────────────────────────────
// MANAGES ONE EFFECTCHAIN PER TRACK FOR SPRITE LAYERS.
// KEYED BY TRACKID, AUTO-CREATES/DESTROYS AS TRACKS CHANGE.

export class TrackEffectChains {
  constructor(canvasW, canvasH) {
    this._w = canvasW;
    this._h = canvasH;
    this._chains = {}; // TRACKID → EFFECTCHAIN
  }

  // CALL EACH FRAME WITH THE CURRENT TRACK LIST TO KEEP CHAINS IN SYNC
  sync(tracks) {
    const activeIds = new Set(tracks.map((t) => t.id));
    // REMOVE STALE
    for (const id of Object.keys(this._chains)) {
      if (!activeIds.has(id)) delete this._chains[id];
    }
    // CREATE NEW
    for (const track of tracks) {
      if (!this._chains[track.id]) {
        this._chains[track.id] = new EffectChain(this._w, this._h);
      }
    }
  }

  get(trackId) {
    return this._chains[trackId] || null;
  }
}