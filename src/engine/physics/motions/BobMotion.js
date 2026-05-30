// ENGINE/PHYSICS/MOTIONS/BOBMOTION.JS
//
// SINE-WAVE BOBBING — OSCILLATES X, Y, SCALE, AND/OR ROTATION OVER TIME.
//
// CONFIG:
// {
//   TYPE: "BOB",
//   AMPLITUDEX:  0,    // PX HORIZONTAL OSCILLATION
//   AMPLITUDEY:  20,   // PX VERTICAL OSCILLATION
//   SCALEAMOUNT: 0,    // SCALE OSCILLATION (0 = NONE, 0.1 = ±10%)
//   ROTAMOUNT:   0,    // DEGREES ROTATION OSCILLATION
//   FREQUENCY:   1.0,  // CYCLES PER SECOND
//   PHASE:       0,    // PHASE OFFSET IN RADIANS (FOR STAGGERING MULTIPLE LAYERS)
// }

export class BobMotion {
  constructor() {
    this._time = 0;
  }

  update(dt, cfg) {
    this._time += dt / 1000; // CONVERT MS → SECONDS

    const freq       = cfg.frequency   ?? 1.0;
    const ampX       = cfg.amplitudeX  ?? 0;
    const ampY       = cfg.amplitudeY  ?? 20;
    const scaleAmt   = cfg.scaleAmount ?? 0;
    const rotAmt     = cfg.rotAmount   ?? 0;
    const phase      = cfg.phase       ?? 0;

    const sine = Math.sin(this._time * freq * Math.PI * 2 + phase);

    return {
      x:        ampX     * sine,
      y:        ampY     * sine,
      scaleX:   scaleAmt * sine,
      scaleY:   scaleAmt * sine,
      rotation: rotAmt   * sine,
    };
  }
}