// ENGINE/EFFECTS/GLITCHEFFECT.JS
//
// PER-LAYER GLITCH EFFECT INSPIRED BY K17-STYLE SHARD LAYERING.
//
// CONFIG SHAPE:
// { TYPE: "glitch", INTENSITY: 0–1, SPEED: 0–1 }

export class GlitchEffect {
  constructor() {
    this._timer    = 0;
    this._interval = 0;
    this._shards   = [];
    this._rgbClips = [];
    this._rgbShift = { r: 0, b: 0 };
    this._dirty    = true;
    this._diagLogged = false;

    this._rgbCanvas = document.createElement("canvas");
    this._rgbCtx    = this._rgbCanvas.getContext("2d");
  }

  _generateFrame(w, h, intensity) {
    const shardCount = Math.floor(3 + intensity * 4);
    this._shards = [];
    for (let i = 0; i < shardCount; i++) {
      const sy     = Math.random() * h;
      const sh     = Math.random() * (h * 0.10 * intensity) + 3;
      const offset = (Math.random() - 0.5) * intensity * 90;
      const alpha  = 0.55 + Math.random() * 0.35;
      const flash  = Math.random() < intensity * 0.25;
      this._shards.push({ sy, sh, offset, alpha, flash });
    }

    const bandCount = 2 + Math.floor(intensity * 2);
    this._rgbClips  = [];
    let cursor      = 0;
    const sliceH    = h / bandCount;
    for (let i = 0; i < bandCount; i++) {
      const top    = cursor + Math.random() * sliceH * 0.4;
      const bottom = cursor + sliceH * (0.5 + Math.random() * 0.5);
      this._rgbClips.push({ top, bottom });
      cursor += sliceH;
    }

    const split      = 3 + intensity * 10;
    this._rgbShift.r = (Math.random() - 0.5) * split;
    this._rgbShift.b = (Math.random() - 0.5) * split;
  }

  _calcInterval(speed) {
    return 800 - speed * 760;
  }

  apply(ctx, canvas, cfg, dt) {
    const intensity = cfg.intensity ?? 0.5;
    const speed     = cfg.speed     ?? 0.5;

    // ── DIAGNOSTICS — remove once confirmed working ─────────────────────────
    if (!this._diagLogged) {
      this._diagLogged = true;
      console.log("[GlitchEffect] apply() first call", {
        intensity,
        speed,
        cfg,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
        ctxType: ctx?.constructor?.name,
        filterSupported: typeof ctx?.filter === "string",
        dtValue: dt,
        intensityIsZero: intensity === 0,
      });
    }
    // ───────────────────────────────────────────────────────────────────────

    if (intensity === 0) {
      console.warn("[GlitchEffect] bailing — intensity is 0");
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    if (!w || !h) {
      console.warn("[GlitchEffect] bailing — canvas has no dimensions", w, h);
      return;
    }

    this._timer   += dt;
    this._interval = this._calcInterval(speed);

    if (this._dirty || this._timer >= this._interval) {
      this._generateFrame(w, h, intensity);
      this._timer = 0;
      this._dirty = false;
    }

    // STEP 0: base draw
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    // STEP 1: RGB channel split
    const filterSupported = typeof ctx.filter === "string";

    if (this._rgbCanvas.width !== w || this._rgbCanvas.height !== h) {
      this._rgbCanvas.width  = w;
      this._rgbCanvas.height = h;
    }

    const { r, b } = this._rgbShift;
    const rgbAlpha = 0.28 + intensity * 0.12;

    if (filterSupported) {
      this._rgbCtx.clearRect(0, 0, w, h);
      this._rgbCtx.filter = `hue-rotate(80deg) saturate(1.8)`;
      this._rgbCtx.drawImage(canvas, 0, 0);
      this._rgbCtx.filter = "none";

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = rgbAlpha;
      for (const band of this._rgbClips) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, band.top, w, band.bottom - band.top);
        ctx.clip();
        ctx.drawImage(this._rgbCanvas, r, 0);
        ctx.restore();
      }
      ctx.restore();

      this._rgbCtx.clearRect(0, 0, w, h);
      this._rgbCtx.filter = `hue-rotate(260deg) saturate(1.8)`;
      this._rgbCtx.drawImage(canvas, 0, 0);
      this._rgbCtx.filter = "none";

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = rgbAlpha * 0.85;
      for (const band of this._rgbClips) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, band.top, w, band.bottom - band.top);
        ctx.clip();
        ctx.drawImage(this._rgbCanvas, -b, 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // STEP 2: shard slices
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const shard of this._shards) {
      const { sy, sh, offset, alpha, flash } = shard;
      if (Math.abs(offset) < 0.5) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, sy, w, sh);
      ctx.clip();

      ctx.globalAlpha = alpha;
      ctx.drawImage(canvas, 0, sy, w, sh, offset, sy, w, sh);

      if (flash) {
        ctx.globalAlpha = (0.15 + Math.random() * 0.25) * intensity;
        ctx.fillStyle   = Math.random() > 0.5 ? "#ffffff" : "#00ffff";
        ctx.fillRect(0, sy, w, sh);
      }

      ctx.restore();
    }

    ctx.restore();

    // STEP 3: scanlines
    if (intensity > 0.25) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.03 + intensity * 0.04;
      ctx.fillStyle   = "#ffffff";
      for (let ly = 0; ly < h; ly += 6) {
        ctx.fillRect(0, ly, w, 1);
      }
      ctx.restore();
    }

    // STEP 4: noise burst
    if (intensity > 0.6 && Math.random() < intensity * 0.04) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.07 * intensity;
      ctx.fillStyle   = "#00ffff";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}