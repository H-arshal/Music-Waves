(() => {
if (window.__colors_loaded) return;
window.__colors_loaded = true;

const ColorThemes = {
  neon: {
    name: "Neon",
    colors: ["#ff00ff", "#00ffff", "#ff00aa", "#aa00ff", "#00ffaa"],
    background: "rgba(0, 0, 0, 0.85)",
    glow: true
  },
  ocean: {
    name: "Ocean",
    colors: ["#0077be", "#00aaff", "#0055aa", "#0099cc", "#003366"],
    background: "rgba(0, 10, 30, 0.85)",
    glow: true
  },
  sunset: {
    name: "Sunset",
    colors: ["#ff4500", "#ff6b35", "#ffa500", "#ff8c00", "#ffcc00"],
    background: "rgba(20, 5, 0, 0.85)",
    glow: true
  },
  cyberpunk: {
    name: "Cyberpunk",
    colors: ["#f72585", "#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0"],
    background: "rgba(5, 0, 20, 0.85)",
    glow: true
  },
  spotify: {
    name: "Spotify Green",
    colors: ["#1db954", "#1ed760", "#169c46", "#1aa34a", "#12b550"],
    background: "rgba(0, 10, 0, 0.85)",
    glow: true
  },
  rainbow: {
    name: "Rainbow",
    colors: ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#8800ff"],
    background: "rgba(0, 0, 0, 0.85)",
    glow: true
  },
  material: {
    name: "Material",
    colors: ["#f44336", "#e91e63", "#9c27b0", "#3f51b5", "#03a9f4", "#009688"],
    background: "rgba(30, 30, 30, 0.85)",
    glow: false
  },
  amoled: {
    name: "AMOLED",
    colors: ["#ffffff", "#cccccc", "#999999", "#666666", "#333333"],
    background: "rgba(0, 0, 0, 0.95)",
    glow: true
  }
};

function getColorForIndex(theme, index, total) {
  const colors = ColorThemes[theme]?.colors || ColorThemes.neon.colors;
  const pos = (index / total) * (colors.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const c1 = hexToRgb(colors[i]);
  const c2 = hexToRgb(colors[Math.min(i + 1, colors.length - 1)]);
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * f),
    g: Math.round(c1.g + (c2.g - c1.g) * f),
    b: Math.round(c1.b + (c2.b - c1.b) * f)
  };
}

function rgbString(c, a = 1) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}

function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

window.ColorThemes = ColorThemes;
window.getColorForIndex = getColorForIndex;
window.rgbString = rgbString;
window.hexToRgb = hexToRgb;
window.lerpColor = lerpColor;

})();
