(() => {
if (window.__circle_loaded) return;
window.__circle_loaded = true;

class CircleVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.angle = 0;
  }

  draw(data, theme, sensitivity) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const freq = data.frequency;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.25;
    const barCount = 128;

    ctx.clearRect(0, 0, width, height);

    this.angle += 0.005;

    if (ColorThemes[theme]?.glow) {
      ctx.shadowBlur = data.isSnare ? 40 : 25;
    }

    const innerGlow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.5);
    const bassColor = getColorForIndex(theme, 0, 1);
    innerGlow.addColorStop(0, rgbString(bassColor, data.bass * sensitivity * 0.3));
    innerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < barCount; i++) {
      const index = Math.floor((i / barCount) * freq.length * 0.7);
      const value = (freq[index] / 255) * sensitivity;
      const pulse = data.isKick ? 1.15 : 1.0;
      const barLength = value * radius * 1.5 * pulse + 5;
      const angle = (i / barCount) * Math.PI * 2 + this.angle;

      const color = getColorForIndex(theme, i, barCount);

      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + barLength);
      const y2 = cy + Math.sin(angle) * (radius + barLength);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = rgbString(color, 0.7 + value * 0.3);
      ctx.lineWidth = 2;
      ctx.shadowColor = rgbString(color, 0.5);
      ctx.stroke();
    }

    ctx.beginPath();
    const corePulse = data.isKick ? 1.1 : 1.0;
    ctx.arc(cx, cy, radius * (0.8 + data.bass * sensitivity * 0.3) * corePulse, 0, Math.PI * 2);
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * corePulse);
    const c1 = getColorForIndex(theme, 0, 1);
    const c2 = getColorForIndex(theme, 1, 2);
    centerGrad.addColorStop(0, rgbString(c1, 0.4));
    centerGrad.addColorStop(1, rgbString(c2, 0.1));
    ctx.fillStyle = centerGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

window.CircleVisualizer = CircleVisualizer;

})();
