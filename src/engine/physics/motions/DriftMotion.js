// ENGINE/PHYSICS/MOTIONS/DRIFTMOTION.JS
//
// CONTINUOUS DIRECTIONAL DRIFT WITH OPTIONAL WRAP-AROUND.
//
// CONFIG:
// {
//   TYPE: "DRIFT",
//   SPEEDX:   0,     // PX PER SECOND HORIZONTAL
//   SPEEDY:   -30,   // PX PER SECOND VERTICAL (NEGATIVE = UPWARD)
//   WRAP:     TRUE,  // WRAP AROUND CANVAS EDGES
//   WRAPW:    1920,  // WRAP BOUNDARY WIDTH  (USE VIRTUAL_W)
//   WRAPH:    1080,  // WRAP BOUNDARY HEIGHT (USE VIRTUAL_H)
// }

export class DriftMotion {
  constructor() {
    this._x = 0;
    this._y = 0;
  }

  update(dt, cfg) {
    const speedX = cfg.speedX ?? 0;
    const speedY = cfg.speedY ?? -30;
    const wrap   = cfg.wrap   ?? true;
    const wrapW  = cfg.wrapW  ?? 1920;
    const wrapH  = cfg.wrapH  ?? 1080;

    this._x += speedX * (dt / 1000);
    this._y += speedY * (dt / 1000);

    if (wrap) {
      if (this._x >  wrapW) this._x -= wrapW;
      if (this._x < -wrapW) this._x += wrapW;
      if (this._y >  wrapH) this._y -= wrapH;
      if (this._y < -wrapH) this._y += wrapH;
    }

    return { x: this._x, y: this._y };
  }
}