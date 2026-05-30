// ENGINE/EFFECTS/HUESHIFTEFFECT.JS

export class HueShiftEffect {
  constructor() {
    this._currentHue = 0;
  }

  _degreesPerMs(speed) {
    return speed * 0.18;
  }

  apply(ctx, canvas, cfg, dt) {
    const hue        = cfg.hue        ?? 0;
    const animate    = cfg.animate    ?? false;
    const speed      = cfg.speed      ?? 0.5;
    const saturation = cfg.saturation ?? 1.0;
    const brightness = cfg.brightness ?? 1.0;

    if (animate) {
      this._currentHue = (this._currentHue + this._degreesPerMs(speed) * dt) % 360;
    } else {
      this._currentHue = 0;
    }

    const totalHue = (hue + this._currentHue) % 360;

    if (totalHue === 0 && saturation === 1.0 && brightness === 1.0) return;

    const filterParts = [];
    if (totalHue !== 0)     filterParts.push(`hue-rotate(${totalHue.toFixed(1)}deg)`);
    if (saturation !== 1.0) filterParts.push(`saturate(${saturation.toFixed(2)})`);
    if (brightness !== 1.0) filterParts.push(`brightness(${brightness.toFixed(2)})`);

    // EFFECTCHAIN GUARANTEES CTX AND CANVAS ARE A CLEAN COPY (PING-PONG BUFFER),
    // SO WE CAN DRAW DIRECTLY BACK ONTO CTX WITH THE FILTER APPLIED.
    // WE READ THE CURRENT PIXELS VIA A SNAPSHOT OF CANVAS, CLEAR, AND REDRAW FILTERED.
    const filterStr = filterParts.join(" ");
    ctx.filter = filterStr;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }
}