// PARTICLESYSTEM.JS

export class ParticleSystem {
  constructor(cfg) {
    this.cfg = cfg;
    this.particles = [];
    this.init();
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.cfg.count; i++) {
      this.particles.push(this.spawn(true));
    }
  }

  spawn(random = false) {
    const W = this.cfg.width || 400, H = this.cfg.height || 300;
    return {
      x: Math.random() * W,
      y: random ? Math.random() * H : H + 5,
      vx: (Math.random() - 0.5) * this.cfg.speedX,
      vy: -(Math.random() * this.cfg.speedY + 0.5),
      size: Math.random() * this.cfg.size + 1,
      alpha: Math.random() * 0.6 + 0.3,
      life: Math.random(),
    };
  }

  update() {
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.002;
      if (p.y < -5 || p.life <= 0) {
        Object.assign(p, this.spawn());
      }
    });
  }

  render(ctx) {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = p.alpha * Math.max(0, p.life * 2);
      ctx.fillStyle = this.cfg.color || "#A55AFF";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}