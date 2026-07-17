(() => {
if (window.__wave_loaded) return;
window.__wave_loaded = true;

class WaveVisualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  draw(data, theme, sensitivity) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const wave = data.waveform;
    const colors = ColorThemes[theme]?.colors || ColorThemes.neon.colors;

    ctx.clearRect(0, 0, width, height);

    const layers = 3;
    for (let layer = 0; layer < layers; layer++) {
      const color = hexToRgb(colors[layer % colors.length]);
      const alpha = 1 - layer * 0.25;
      const yOffset = height / 2 + (layer - 1) * 20;
      const amp = sensitivity * (0.9 - layer * 0.15);

      ctx.beginPath();
      ctx.moveTo(0, yOffset);

      const sliceWidth = width / wave.length;
      let x = 0;

      for (let i = 0; i < wave.length; i++) {
        const v = wave[i] / 128.0;
        let y = yOffset + (v - 1) * height * 0.4 * amp;
        
        if (data.isSnare) {
          y += (Math.random() - 0.5) * 30 * sensitivity;
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * sliceWidth;
          const prevV = wave[i - 1] / 128.0;
          const prevY = yOffset + (prevV - 1) * height * 0.4 * amp;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, yOffset);
      ctx.strokeStyle = rgbString(color, alpha);
      const pulseWidth = (data.isKick || data.isSnare) ? 2 : 0;
      ctx.lineWidth = 3 - layer * 0.5 + pulseWidth;

      if (ColorThemes[theme]?.glow) {
        ctx.shadowBlur = (data.isKick || data.isSnare) ? 35 : 20;
        ctx.shadowColor = rgbString(color, (data.isKick || data.isSnare) ? 1.0 : 0.6);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      const grad = ctx.createLinearGradient(0, yOffset - 60, 0, yOffset + 60);
      grad.addColorStop(0, rgbString(color, 0));
      grad.addColorStop(0.5, rgbString(color, alpha * 0.15));
      grad.addColorStop(1, rgbString(color, 0));

      ctx.lineTo(width, yOffset + 60);
      ctx.lineTo(0, yOffset + 60);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}

window.WaveVisualizer = WaveVisualizer;

})();
