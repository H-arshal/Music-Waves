const toggleBtn = document.getElementById("toggle-btn");
const btnIcon = document.getElementById("btn-icon");
const btnText = document.getElementById("btn-text");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const errorMsg = document.getElementById("error-msg");

let isActive = false;
let port = null;

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
    btnIcon.textContent = "■";
    btnText.textContent = "Stop";
    toggleBtn.classList.add("active");
    statusEl.classList.remove("hidden");
    statusText.textContent = "Active — capturing tab audio";
    hideError();
  } else {
    btnIcon.textContent = "▶";
    btnText.textContent = "Start";
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
      document.getElementById("sensitivity").value = result.sensitivity;
      document.getElementById("sens-val").textContent = result.sensitivity.toFixed(1);
      document.getElementById("opacity").value = result.opacity;
      document.getElementById("opac-val").textContent = result.opacity.toFixed(2);
      document.getElementById("fftSize").value = result.fftSize;
    }
  );
}

function setRadio(groupId, name, value) {
  const group = document.getElementById(groupId);
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

document.getElementById("sensitivity").addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("sens-val").textContent = val.toFixed(1);
  saveSetting("sensitivity", val);
});

document.getElementById("opacity").addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("opac-val").textContent = val.toFixed(2);
  saveSetting("opacity", val);
});

document.getElementById("fftSize").addEventListener("change", (e) => {
  const val = parseInt(e.target.value);
  saveSetting("fftSize", val);
});

connectToBackground();
loadSettings();
setupRadioListeners();

port.postMessage({ action: "getStatus" });
