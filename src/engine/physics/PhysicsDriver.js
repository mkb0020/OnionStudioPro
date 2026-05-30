// ENGINE/PHYSICS/PHYSICSDRIVER.JS
//
// MANAGES PER-LAYER MOTION AND OUTPUTS A TRANSFORM EACH FRAME.
// THE RENDER LOOP READS TRANSFORM AND PASSES IT TO RENDERERS.
//
// PHYSICS CONFIG SHAPE (STORED AS LAYER.PHYSICS):
// {
//   MOTIONS: [
//     { TYPE: "BOB",   ...PARAMS },
//     { TYPE: "DRIFT", ...PARAMS },
//     { TYPE: "ORBIT", ...PARAMS },
//   ]
// }
//
// OUTPUT TRANSFORM (ADDITIVE OFFSETS ON TOP OF BASE CONFIG VALUES):
// { X: 0, Y: 0, SCALEX: 1, SCALEY: 1, ROTATION: 0 }

import { BobMotion }   from "./motions/BobMotion";
import { DriftMotion } from "./motions/DriftMotion";
import { OrbitMotion } from "./motions/OrbitMotion";

const MOTION_REGISTRY = {
  bob:   BobMotion,
  drift: DriftMotion,
  orbit: OrbitMotion,
};

export const EMPTY_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

export class PhysicsDriver {
  constructor() {
    this._instances = {};
    this.transform  = { ...EMPTY_TRANSFORM };
  }

  _sync(motions) {
    const activeTypes = new Set(motions.map((m) => m.type));
    for (const type of Object.keys(this._instances)) {
      if (!activeTypes.has(type)) delete this._instances[type];
    }
    for (const cfg of motions) {
      if (!this._instances[cfg.type] && MOTION_REGISTRY[cfg.type]) {
        this._instances[cfg.type] = new MOTION_REGISTRY[cfg.type]();
      }
    }
  }

  update(dt, physicsCfg) {
    if (!physicsCfg?.motions?.length) {
      this.transform = { ...EMPTY_TRANSFORM };
      return this.transform;
    }

    this._sync(physicsCfg.motions);

    const t = { x: 0, y: 0, scaleX: 0, scaleY: 0, rotation: 0 };

    for (const cfg of physicsCfg.motions) {
      const instance = this._instances[cfg.type];
      if (!instance) continue;
      const delta = instance.update(dt, cfg);
      t.x        += delta.x        ?? 0;
      t.y        += delta.y        ?? 0;
      t.scaleX   += delta.scaleX   ?? 0; // MOTIONS RETURN DELTAS FROM 0
      t.scaleY   += delta.scaleY   ?? 0;
      t.rotation += delta.rotation ?? 0;
    }

    // SCALEX/Y ARE OFFSETS; FINAL SCALE = 1 + OFFSET, CLAMPED > 0
    t.scaleX = Math.max(0.01, 1 + t.scaleX);
    t.scaleY = Math.max(0.01, 1 + t.scaleY);

    this.transform = t;
    return t;
  }
}