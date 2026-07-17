(() => {
if (window.__bars_loaded) return;
window.__bars_loaded = true;

class BarsVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  draw(data, theme, sensitivity) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const freq = data.frequency;
    const barCount = 64;
    const barWidth = width / barCount - 2;
    const gap = 2;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < barCount; i++) {
      const index = Math.floor((i / barCount) * freq.length);
      const value = (freq[index] / 255) * sensitivity;
      let barHeight = value * height * 0.85;
      if (data.isKick) barHeight *= 1.2;
      
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      const color = getColorForIndex(theme, i, barCount);

      if (ColorThemes[theme]?.glow) {
        ctx.shadowBlur = data.isKick ? 25 : 15;
        ctx.shadowColor = rgbString(color, data.isKick ? 1 : 0.8);
      }

      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, rgbString(color, 0.3));
      gradient.addColorStop(0.5, rgbString(color, 0.7));
      gradient.addColorStop(1, rgbString(color, 1));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const r = Math.min(3, barWidth / 2, barHeight / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }
}

window.BarsVisualizer = BarsVisualizer;

})();
