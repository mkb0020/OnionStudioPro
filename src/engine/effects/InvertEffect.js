// INVERTEFFECT.JS

// ENGINE/EFFECTS/INVERTEFFECT.JS
//
// PER-LAYER COLOR INVERSION WITH OPTIONAL BLEND AMOUNT.
//
// CONFIG SHAPE:
// {
//   TYPE: "INVERT",
//   AMOUNT: 1.0,   // 0–1  — 0 = NO INVERT, 1 = FULL INVERT, 0.5 = HALFWAY (GREYED)
// }

export class InvertEffect {
  apply(ctx, canvas, cfg, dt) {
    const amount = cfg.amount ?? 1.0;
    if (amount === 0) return;

    // CSS FILTER HANDLES THIS CLEANLY — EFFECTCHAIN PING-PONG MEANS
    // CTX AND CANVAS ARE SEPARATE SURFACES SO DRAWIMAGE IS SAFE
    ctx.filter = `invert(${amount.toFixed(2)})`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }
}