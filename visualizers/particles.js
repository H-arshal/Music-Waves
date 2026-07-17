(() => {
if (window.__particles_loaded) return;
window.__particles_loaded = true;

class ParticlesVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
    this.lastBass = 0;
    this.beatThreshold = 0.4;
  }

  draw(data, theme, sensitivity) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    const bass = data.bass * sensitivity;

    if (data.isKick) {
      const count = Math.floor(bass * 50) + 10;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + bass * 6;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed * (0.5 + Math.random()),
          vy: Math.sin(angle) * speed * (0.5 + Math.random()),
          life: 1,
          decay: 0.005 + Math.random() * 0.015,
          size: 2 + Math.random() * 4,
          colorIdx: Math.random()
        });
      }
    }
    this.lastBass = bass;

    const ambientCount = 5;
    for (let i = 0; i < ambientCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.min(width, height) * 0.4;
      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        size: 1 + data.overall * sensitivity * 3,
        colorIdx: Math.random()
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const color = getColorForIndex(theme, p.colorIdx, 1);
      const alpha = p.life * 0.9;

      if (ColorThemes[theme]?.glow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = rgbString(color, 0.6);
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = rgbString(color, alpha);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 + bass * 50);
    const c1 = getColorForIndex(theme, 0, 1);
    coreGrad.addColorStop(0, rgbString(c1, 0.6));
    coreGrad.addColorStop(0.5, rgbString(c1, 0.2));
    coreGrad.addColorStop(1, "transparent");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + bass * 50, 0, Math.PI * 2);
    ctx.fill();
  }
}

window.ParticlesVisualizer = ParticlesVisualizer;

})();
