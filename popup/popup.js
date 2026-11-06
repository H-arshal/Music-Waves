const toggleBtn = document.getElementById("toggle-btn");
const btnIcon = document.getElementById("btn-icon");
const btnText = document.getElementById("btn-text");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const errorMsg = document.getElementById("error-msg");
const sensSlider = document.getElementById("sensitivity");
const opacSlider = document.getElementById("opacity");
const fftSelect = document.getElementById("fftSize");

const dropdownTrigger = document.getElementById("dropdown-trigger");
const dropdownMenu = document.getElementById("dropdown-menu");
const selectedFftText = document.getElementById("selected-fft-text");

let isActive = false;
let port = null;

const PLAY_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8c-.8-.5-1.8.1-1.8 1.1v8.2c0 1 .9 1.6 1.8 1.1l7.2-4.1c.8-.5.8-1.7 0-2.2L4.5 2.8z"/></svg>`;
const STOP_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>`;

function updateSliderTrack(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${pct}%, #d8e5f8 ${pct}%, #d8e5f8 100%)`;
}

function updateFftDropdown(value) {
  const option = document.querySelector(`.dropdown-option[data-value="${value}"]`);
  if (option) {
    document.querySelectorAll(".dropdown-option").forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    const labelSpan = option.querySelector("span");
    if (labelSpan && selectedFftText) {
      selectedFftText.textContent = labelSpan.textContent;
    }
  }
}

function connectToBackground() {
  port = chrome.runtime.connect({ name: "popup" });

  port.onMessage.addListener((msg) => {
    if (msg.action === "status") {
      isActive = msg.active;
      updateUI();
    }
    if (msg.action === "error") {
      showError(msg.message);
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
  });
}

function updateUI() {
  if (isActive) {
    btnIcon.innerHTML = STOP_ICON_SVG;
    btnText.textContent = "Stop Visualizer";
    toggleBtn.classList.add("active");
    statusEl.classList.remove("hidden");
    statusText.textContent = "Active — capturing tab audio";
    hideError();
  } else {
    btnIcon.innerHTML = PLAY_ICON_SVG;
    btnText.textContent = "Start Visualizer";
    toggleBtn.classList.remove("active");
    statusEl.classList.add("hidden");
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

toggleBtn.addEventListener("click", () => {
  hideError();
  if (!port) connectToBackground();

  if (isActive) {
    port.postMessage({ action: "stop" });
  } else {
    port.postMessage({ action: "start" });
  }
});

function loadSettings() {
  chrome.storage.sync.get(
    { style: "bars", theme: "neon", sensitivity: 1.0, opacity: 0.9, fftSize: 512, bgMode: "glass" },
    (result) => {
      setRadio("style-group", "style", result.style);
      setRadio("theme-group", "theme", result.theme);
      setRadio("bg-group", "bg", result.bgMode);

      sensSlider.value = result.sensitivity;
      document.getElementById("sens-val").textContent = result.sensitivity.toFixed(1);
      updateSliderTrack(sensSlider);

      opacSlider.value = result.opacity;
      document.getElementById("opac-val").textContent = result.opacity.toFixed(2);
      updateSliderTrack(opacSlider);

      fftSelect.value = result.fftSize;
      updateFftDropdown(result.fftSize);
    }
  );
}

function setRadio(groupId, name, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const radio = group.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function setupRadioListeners() {
  document.querySelectorAll('input[name="style"]').forEach((r) => {
    r.addEventListener("change", () => saveSetting("style", r.value));
  });
  document.querySelectorAll('input[name="theme"]').forEach((r) => {
    r.addEventListener("change", () => saveSetting("theme", r.value));
  });
  document.querySelectorAll('input[name="bg"]').forEach((r) => {
    r.addEventListener("change", () => saveSetting("bgMode", r.value));
  });
}

function setupDropdown() {
  if (!dropdownTrigger || !dropdownMenu) return;

  dropdownTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !dropdownMenu.classList.contains("hidden");
    if (isOpen) {
      dropdownMenu.classList.add("hidden");
      dropdownTrigger.classList.remove("open");
      dropdownTrigger.setAttribute("aria-expanded", "false");
    } else {
      dropdownMenu.classList.remove("hidden");
      dropdownTrigger.classList.add("open");
      dropdownTrigger.setAttribute("aria-expanded", "true");
    }
  });

  document.querySelectorAll(".dropdown-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = parseInt(opt.getAttribute("data-value"), 10);
      fftSelect.value = val;
      updateFftDropdown(val);
      dropdownMenu.classList.add("hidden");
      dropdownTrigger.classList.remove("open");
      dropdownTrigger.setAttribute("aria-expanded", "false");
      saveSetting("fftSize", val);
    });
  });

  document.addEventListener("click", () => {
    if (!dropdownMenu.classList.contains("hidden")) {
      dropdownMenu.classList.add("hidden");
      dropdownTrigger.classList.remove("open");
      dropdownTrigger.setAttribute("aria-expanded", "false");
    }
  });
}

function saveSetting(key, value) {
  chrome.storage.sync.set({ [key]: value });
  sendSettingsToOverlay({ [key]: value });
}

function sendSettingsToOverlay(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "updateSettings", settings }).catch(() => {});
    }
  });
}

sensSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("sens-val").textContent = val.toFixed(1);
  updateSliderTrack(e.target);
  saveSetting("sensitivity", val);
});

opacSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("opac-val").textContent = val.toFixed(2);
  updateSliderTrack(e.target);
  saveSetting("opacity", val);
});

fftSelect.addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);
  updateFftDropdown(val);
  saveSetting("fftSize", val);
});

connectToBackground();
loadSettings();
setupRadioListeners();
setupDropdown();

if (port) {
  port.postMessage({ action: "getStatus" });
}
