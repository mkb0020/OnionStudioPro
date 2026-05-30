// ENGINE/PHYSICS/MOTIONS/ORBITMOTION.JS
//
// CIRCULAR/ELLIPTICAL ORBIT AROUND THE LAYER'S BASE POSITION.
//
// CONFIG:
// {
//   TYPE: "ORBIT",
//   RADIUSX:   60,   // HORIZONTAL RADIUS IN PX
//   RADIUSY:   60,   // VERTICAL RADIUS IN PX (SET DIFFERENT FROM X FOR ELLIPSE)
//   SPEED:     0.5,  // REVOLUTIONS PER SECOND (NEGATIVE = CLOCKWISE)
//   PHASE:     0,    // STARTING ANGLE OFFSET IN RADIANS
// }

export class OrbitMotion {
  constructor() {
    this._angle = 0;
  }

  update(dt, cfg) {
    const radiusX = cfg.radiusX ?? 60;
    const radiusY = cfg.radiusY ?? 60;
    const speed   = cfg.speed   ?? 0.5;
    const phase   = cfg.phase   ?? 0;

    this._angle += speed * (dt / 1000) * Math.PI * 2;

    return {
      x: Math.cos(this._angle + phase) * radiusX,
      y: Math.sin(this._angle + phase) * radiusY,
    };
  }
}