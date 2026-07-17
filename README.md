# 🎵 Music Waves Visualizer

A premium, interactive Chrome extension that captures active tab audio and renders high-performance, real-time visualizations directly overlaying your web pages. Specially optimized for an immersive background experience on **Spotify**, **YouTube Music**, **SoundCloud**, and **Apple Music**.

---

## ✨ Features

- **🥁 Advanced Beat Detection Engine**: Real-time kick drum and snare analysis to synchronize explosive scaling, screen jitters, and particle bursts exactly to the drop.
- **🎨 4 Visualizer Styles**:
  - `█ Bars`: Rounded frequency spectrum bars with neon glows.
  - `◎ Circle`: A pulsating speaker-like circle visualizer.
  - `〰 Wave`: Smooth layered waveforms that react electrically to snares.
  - `✦ Particles`: Orbiting particle stars shooting out in bursts on low bass.
- **🎬 Fullscreen / Cinema Mode**: A one-click toggle button on the overlay to expand the visualizer to fill the entire browser window.
- **🕶️ Immersive Background Integration**: Automatically blends with **Spotify**, **YouTube Music**, **SoundCloud**, and **Apple Music** by turning their app backgrounds transparent and running the visualizer behind the tracklist/album art.
- **🎛️ Live Customization**:
  - Sensitivity and opacity sliders.
  - 8 distinct color themes (Neon, Ocean, Sunset, Cyberpunk, Spotify Green, Rainbow, Material, AMOLED).
  - Background blending modes (Glassmorphic blur, plain blur, solid black, clear transparent).
  - Dynamically adjustable FFT size for frequency detail.

---

## 🚀 Installation (Local Developer Mode)

Since this extension is in active development, you can load it locally:

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle switch in the top-right corner).
4. Click **Load unpacked** in the top-left corner.
5. Select the `Music-waves-visualizer-extension` project folder.

---

## 🛠️ Usage

1. Open a tab and start playing music (e.g., Spotify Web Player or YouTube Music).
2. Click the **Music Waves** extension icon in your Chrome toolbar.
3. Choose your visualizer style, theme, and settings.
4. Click **Start** and enjoy!
5. Hover over the overlay to drag, resize, maximize, or stop the visualizer.

---

## 📁 Repository Structure

```tree
├── assets/          # Extension store icons
├── offscreen/       # Offscreen document handles audio capturing (bypass sandbox restrictions)
├── overlay/         # Overlay canvas elements, resize/drag handlers, CSS themes
├── popup/           # Settings menu UI and popup controls
├── utils/           # Shared styling themes, color conversion, and beat detection logic
├── visualizers/     # Visualizer rendering algorithms (Bars, Wave, Circle, Particles)
└── manifest.json    # Chrome Extension MV3 configuration
```
