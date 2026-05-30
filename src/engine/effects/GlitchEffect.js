// GLITCHEFFECT.JS 

// ENGINE/EFFECTS/GLITCHEFFECT.JS
//
// PER-LAYER GLITCH EFFECT WITH CONFIGURABLE INTENSITY AND SPEED.
// PRODUCES: HORIZONTAL BAND SLICING, RGB CHANNEL SPLITTING, AND SCANLINE FLASHES.
//
// CONFIG SHAPE (STORED IN LAYER.EFFECTS[]):
// {
//   TYPE: "GLITCH",
//   INTENSITY: 0.5,   // 0–1  — HOW EXTREME THE DISPLACEMENT AND RGB SPLIT ARE
//   SPEED: 0.5,       // 0–1  — HOW FREQUENTLY A NEW GLITCH FRAME IS GENERATED
// }

export class GlitchEffect {
  constructor() {
    this._timer = 0;
    this._interval = 0;
    this._bands = [];       // CURRENT GLITCH BAND STATE
    this._rgbOffset = { r: 0, g: 0, b: 0 };
    this._dirty = true;     // FORCE A NEW GLITCH FRAME ON FIRST RENDER
  }

  // GENERATE A NEW SET OF GLITCH BANDS BASED ON CURRENT INTENSITY
  _generateBands(canvasH, intensity) {
    const bandCount = Math.floor(3 + intensity * 12); // 3–15 BANDS
    this._bands = [];
    for (let i = 0; i < bandCount; i++) {
      const y = Math.random() * canvasH;
      const h = Math.random() * (canvasH * 0.08 * intensity) + 2;
      const offset = (Math.random() - 0.5) * intensity * 80; // PX SHIFT
      const flash = Math.random() < intensity * 0.3;          // OCCASIONAL WHITE FLASH
      const alpha = Math.random() * 0.6 + 0.1;
      this._bands.push({ y, h, offset, flash, alpha });
    }

    // RGB CHANNEL SPLIT AMOUNT SCALES WITH INTENSITY
    const split = intensity * 12;
    this._rgbOffset = {
      r: (Math.random() - 0.5) * split,
      g: (Math.random() - 0.5) * split * 0.5,
      b: (Math.random() - 0.5) * split,
    };
  }

  // SPEED: 0–1 → INTERVAL ROUGHLY 800MS (SLOW) TO 40MS (FAST)
  _calcInterval(speed) {
    return 800 - speed * 760;
  }

  apply(ctx, canvas, cfg, dt) {
    const intensity = cfg.intensity ?? 0.5;
    const speed = cfg.speed ?? 0.5;

    if (intensity === 0) return;

    // ADVANCE TIMER AND CHECK IF WE NEED A NEW GLITCH FRAME
    this._timer += dt;
    this._interval = this._calcInterval(speed);

    if (this._dirty || this._timer >= this._interval) {
      this._generateBands(canvas.height, intensity);
      this._timer = 0;
      this._dirty = false;
    }

    // ── 1. RGB CHANNEL SPLIT ─────────────────────────────────────────────────
    // DRAW THE OFFSCREEN IMAGE TWICE MORE WITH RED AND BLUE CHANNELS OFFSET,
    // USING MIX BLEND MODES TO FAKE CHANNEL SEPARATION.
    const { r, b } = this._rgbOffset;

    if (Math.abs(r) > 0.5 || Math.abs(b) > 0.5) {
      ctx.save();
      ctx.globalAlpha = 0.35;

      // RED CHANNEL — SHIFT RIGHT/UP
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "url(#glitch-red)"; // FALLBACK BELOW IF UNSUPPORTED
      ctx.drawImage(canvas, r, 0);

      // BLUE CHANNEL — SHIFT LEFT/DOWN
      ctx.filter = "none";
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(canvas, -b, 2);

      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.restore();
    }

    // ── 2. HORIZONTAL BAND SLICING ───────────────────────────────────────────
    // FOR EACH BAND, COPY A HORIZONTAL STRIP FROM THE OFFSCREEN AND REDRAW IT
    // WITH A HORIZONTAL PIXEL OFFSET.
    ctx.save();
    for (const band of this._bands) {
      const { y, h, offset, flash, alpha } = band;

      if (Math.abs(offset) > 0.5) {
        // CLIP TO THE BAND REGION
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, canvas.width, h);
        ctx.clip();

        // CLEAR THEN REDRAW THE STRIP OFFSET
        ctx.clearRect(0, y, canvas.width, h);
        ctx.drawImage(
          canvas,
          0, y, canvas.width, h,         // SOURCE STRIP
          offset, y, canvas.width, h      // DESTINATION — SHIFTED HORIZONTALLY
        );

        // SCANLINE FLASH OVERLAY
        if (flash) {
          ctx.globalAlpha = alpha * intensity;
          ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#00ffff";
          ctx.fillRect(0, y, canvas.width, h);
        }

        ctx.restore();
      }
    }
    ctx.restore();

    // ── 3. OCCASIONAL FULL-FRAME NOISE BURST ─────────────────────────────────
    // AT HIGH INTENSITY, SOMETIMES SLAM A LOW-ALPHA NOISE OVERLAY
    if (intensity > 0.6 && Math.random() < intensity * 0.04) {
      ctx.save();
      ctx.globalAlpha = 0.08 * intensity;
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }
}