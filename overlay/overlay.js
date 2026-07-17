(() => {
  if (window.__mvo_loaded) return;
  window.__mvo_loaded = true;

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let visualizer = null;
  let _lastData = { frequency: new Array(256).fill(0), waveform: new Array(256).fill(128), bass: 0, mid: 0, treble: 0, overall: 0 };
  let isDragging = false;
  let isResizing = false;
  let dragOffset = { x: 0, y: 0 };
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
  let ytStyle = null;

  let settings = {
    style: "bars",
    theme: "neon",
    sensitivity: 1.0,
    opacity: 0.9,
    fftSize: 512,
    fps: 60,
    bgMode: "glass",
    minimized: false
  };

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "music-visualizer-overlay";
    overlay.innerHTML = `
      <div id="mvo-bg-blur"></div>
      <canvas id="mvo-canvas"></canvas>
      <div id="mvo-mini-icon">🎵</div>
      <div id="mvo-controls">
        <span id="mvo-title">MUSIC WAVES</span>
        <div style="display:flex;gap:4px;">
          <button class="mvo-btn" id="mvo-fullscreen" title="Fullscreen">⛶</button>
          <button class="mvo-btn" id="mvo-minimize" title="Minimize">−</button>
          <button class="mvo-btn" id="mvo-close" title="Stop & Close">✕</button>
        </div>
      </div>
      <div id="mvo-resize-handle"></div>
    `;
    document.body.appendChild(overlay);

    const IMMERSIVE_SITES = {
      "music.youtube.com": `
        ytmusic-app, ytmusic-app-layout, #background,
        ytmusic-browse-response, .background-gradient {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `,
      "open.spotify.com": `
        #main, [data-testid="root"], .Root__top-container, 
        .Root__main-view, .main-view-container,
        .os-host, .os-viewport, .os-content,
        .main-view-container__scroll-node,
        .main-view-container__scroll-node-child,
        .main-entityHeader-background, .main-entityHeader-overlay,
        .main-actionBarBackground-background,
        main, body, .Root__nav-bar {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
        /* Keep the bottom player bar solid so you can still see controls clearly */
        .Root__now-playing-bar {
          background-color: rgba(0,0,0,0.8) !important;
          backdrop-filter: blur(10px);
        }
      `,
      "soundcloud.com": `
        #app, body, .l-container, .l-main, .l-content, .discoverWrapper {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
        .playControls {
          background-color: rgba(0,0,0,0.9) !important;
        }
      `,
      "music.apple.com": `
        body, #apple-music-web-player, .application-wrapper,
        .web-navigation, .dt-scrollable, .product-page {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `
    };

    const host = window.location.hostname;
    if (IMMERSIVE_SITES[host]) {
      overlay.classList.add("immersive-mode");
      
      ytStyle = document.createElement("style");
      ytStyle.textContent = IMMERSIVE_SITES[host];
      document.head.appendChild(ytStyle);
    }

    canvas = overlay.querySelector("#mvo-canvas");
    ctx = canvas.getContext("2d");

    loadSettings();
    applySettings();
    setupDrag();
    setupResize();
    setupButtons();

    chrome.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        if (key in settings) {
          settings[key] = changes[key].newValue;
        }
      }
      applySettings();
    });
  }

  function resizeCanvas() {
    if (!canvas || !overlay) return;
    const rect = overlay.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  function loadSettings() {
    chrome.storage.sync.get(
      { style: "bars", theme: "neon", sensitivity: 1.0, opacity: 0.9, fftSize: 512, fps: 60, bgMode: "glass" },
      (result) => {
        settings = { ...settings, ...result };
        applySettings();
      }
    );
  }

  function applySettings() {
    if (overlay) {
      overlay.style.opacity = settings.opacity;
      const bgBlur = overlay.querySelector("#mvo-bg-blur");
      if (bgBlur) {
        switch (settings.bgMode) {
          case "transparent":
            bgBlur.style.display = "none";
            overlay.style.background = "transparent";
            break;
          case "blur":
            bgBlur.style.display = "block";
            bgBlur.style.background = "transparent";
            bgBlur.style.backdropFilter = "blur(20px)";
            overlay.style.background = "transparent";
            break;
          case "glass":
            bgBlur.style.display = "block";
            bgBlur.style.background = "rgba(0,0,0,0.3)";
            bgBlur.style.backdropFilter = "blur(12px)";
            overlay.style.background = "transparent";
            break;
          case "black":
            bgBlur.style.display = "block";
            bgBlur.style.background = "rgba(0,0,0,0.85)";
            bgBlur.style.backdropFilter = "none";
            break;
          case "gradient":
            bgBlur.style.display = "block";
            bgBlur.style.background = "linear-gradient(135deg, rgba(20,0,40,0.9), rgba(0,10,30,0.9))";
            bgBlur.style.backdropFilter = "none";
            break;
          default:
            bgBlur.style.display = "none";
            overlay.style.background = ColorThemes[settings.theme]?.background || "rgba(0,0,0,0.85)";
        }
      }
    }

    updateVisualizer();
  }

  function updateVisualizer() {
    if (!canvas || !ctx) return;
    switch (settings.style) {
      case "bars":
        visualizer = new BarsVisualizer(canvas, ctx);
        break;
      case "wave":
        visualizer = new WaveVisualizer(canvas, ctx);
        break;
      case "circle":
        visualizer = new CircleVisualizer(canvas, ctx);
        break;
      case "particles":
        visualizer = new ParticlesVisualizer(canvas, ctx);
        break;
      default:
        visualizer = new BarsVisualizer(canvas, ctx);
    }
  }

  let renderLoop = null;

  function startRenderLoop() {
    if (renderLoop) return;
    const interval = 1000 / settings.fps;
    let lastTime = 0;

    function loop(time) {
      renderLoop = requestAnimationFrame(loop);
      if (time - lastTime < interval) return;
      lastTime = time;

      if (!visualizer || !ctx || !overlay) return;
      const rect = overlay.getBoundingClientRect();
      const drawWidth = rect.width;
      const drawHeight = rect.height;
      ctx.save();
      ctx.clearRect(0, 0, drawWidth, drawHeight);
      
      // Override canvas dimensions the visualizer sees with logical CSS pixels
      const drawCanvas = { width: drawWidth, height: drawHeight };
      visualizer.canvas = drawCanvas;
      visualizer.draw(
        _lastData,
        settings.theme,
        settings.sensitivity
      );
      // Restore the real canvas reference
      visualizer.canvas = canvas;
      ctx.restore();
    }
    renderLoop = requestAnimationFrame(loop);
  }

  function stopRenderLoop() {
    if (renderLoop) {
      cancelAnimationFrame(renderLoop);
      renderLoop = null;
    }
  }

  async function startVisualization() {
    createOverlay();

    updateVisualizer();
    resizeCanvas();
    if (!audioPort) connectAudioStream();
    startRenderLoop();
    overlay.classList.remove("hidden");
  }

  function stopVisualization() {
    stopRenderLoop();
    if (audioPort) {
      audioPort.disconnect();
      audioPort = null;
    }
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (ytStyle) {
      ytStyle.remove();
      ytStyle = null;
    }
    visualizer = null;
  }

  function setupDrag() {
    const controls = overlay.querySelector("#mvo-controls");
    controls.addEventListener("mousedown", (e) => {
      if (e.target.closest(".mvo-btn")) return;
      isDragging = true;
      const rect = overlay.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      overlay.style.transition = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      overlay.style.left = (e.clientX - dragOffset.x) + "px";
      overlay.style.top = (e.clientY - dragOffset.y) + "px";
      overlay.style.right = "auto";
      overlay.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      overlay.style.transition = "";
    });
  }

  function setupResize() {
    const handle = overlay.querySelector("#mvo-resize-handle");
    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      const rect = overlay.getBoundingClientRect();
      resizeStart = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
      overlay.style.transition = "none";
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const newW = Math.max(200, resizeStart.w + (e.clientX - resizeStart.x));
      const newH = Math.max(140, resizeStart.h + (e.clientY - resizeStart.y));
      overlay.style.width = newW + "px";
      overlay.style.height = newH + "px";
      resizeCanvas();
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      overlay.style.transition = "";
    });
  }

  function setupButtons() {
    overlay.querySelector("#mvo-fullscreen").addEventListener("click", () => {
      settings.fullscreen = !settings.fullscreen;
      overlay.classList.toggle("fullscreen-mode", settings.fullscreen);
      resizeCanvas();
    });

    overlay.querySelector("#mvo-minimize").addEventListener("click", () => {
      settings.minimized = !settings.minimized;
      overlay.classList.toggle("minimized", settings.minimized);
      if (settings.minimized) {
        stopRenderLoop();
      } else {
        resizeCanvas();
        startRenderLoop();
      }
    });

    overlay.querySelector("#mvo-close").addEventListener("click", () => {
      stopVisualization();
      chrome.runtime.sendMessage({ action: "stopFromOverlay" });
    });

    overlay.addEventListener("click", (e) => {
      if (overlay.classList.contains("minimized") && !e.target.closest("#mvo-controls")) {
        settings.minimized = false;
        overlay.classList.remove("minimized");
        resizeCanvas();
        startRenderLoop();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (canvas && overlay && !settings.minimized) {
      resizeCanvas();
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "startVisualization") {
      startVisualization();
      sendResponse({ ok: true });
      return true;
    }

    if (msg.action === "stopVisualization") {
      stopVisualization();
      sendResponse({ ok: true });
      return true;
    }

    if (msg.action === "updateSettings") {
      settings = { ...settings, ...msg.settings };
      applySettings();
      sendResponse({ ok: true });
      return true;
    }
  });

  let audioPort = null;
  let recvCount = 0;
  function connectAudioStream() {
    audioPort = chrome.runtime.connect({ name: "audioStream-content" });
    audioPort.onMessage.addListener((msg) => {
      if (msg.action === "audioData") {
        _lastData = msg.data;
        recvCount++;
        if (recvCount % 60 === 1) {
          console.log("[Overlay] Receiving audio data. Overall:", msg.data.overall?.toFixed(3), "Freq[0]:", msg.data.frequency?.[0]);
        }
      }
    });
    audioPort.onDisconnect.addListener(() => {
      audioPort = null;
      console.log("[Overlay] Audio port disconnected.");
      stopVisualization();
    });
    console.log("[Overlay] Audio port connected.");
  }
})();
