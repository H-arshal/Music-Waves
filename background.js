let activeTabs = {};
let popupPort = null;
let contentPorts = {};
let offscreenPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPort = port;

    port.onMessage.addListener(async (msg) => {
      if (msg.action === "start") {
        await handleStart();
      } else if (msg.action === "stop") {
        await handleStop();
      } else if (msg.action === "getStatus") {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        port.postMessage({
          action: "status",
          active: !!activeTabs[tabId],
          tabId
        });
      }
    });

    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  } else if (port.name === "audioStream-offscreen") {
    offscreenPort = port;
    port.onMessage.addListener((msg) => {
      for (const tabId in contentPorts) {
        try { contentPorts[tabId].postMessage(msg); } catch (e) {}
      }
    });
    port.onDisconnect.addListener(() => {
      offscreenPort = null;
    });
  } else if (port.name === "audioStream-content") {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      contentPorts[tabId] = port;
      port.onDisconnect.addListener(() => {
        delete contentPorts[tabId];
      });
    }
  }
});

async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existingContexts.length > 0) return;
  
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Capturing tab audio for visualization'
  });
}

async function teardownOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

const CONTENT_SCRIPT_FILES = [
  "utils/colors.js",
  "visualizers/bars.js",
  "visualizers/wave.js",
  "visualizers/circle.js",
  "visualizers/particles.js",
  "overlay/overlay.js"
];

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["overlay/overlay.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPT_FILES
    });
  } catch (e) {
    console.warn("Could not inject content script:", e.message);
  }
}

async function handleStart() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return;

  const tabId = tab.id;

  if (activeTabs[tabId]) {
    notifyPopup({ action: "status", active: true, tabId });
    return;
  }

  const url = tab.url || "";
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:")) {
    notifyPopup({ action: "error", message: "Cannot capture audio on this page." });
    return;
  }

  try {
    await ensureContentScript(tabId);
    
    await setupOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    activeTabs[tabId] = { streamId };

    // IMPORTANT: Tell the content script to start FIRST so it connects
    // its audio port before the offscreen document begins streaming data.
    await chrome.tabs.sendMessage(tabId, {
      action: "startVisualization",
      tabId
    });

    // Small delay to ensure the content port is registered in background
    await new Promise(r => setTimeout(r, 100));

    // NOW start offscreen audio capture — content port is ready to receive
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "startCapture", streamId, tabId }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (res && res.ok) resolve();
        else reject(new Error(res?.error || "Capture setup failed"));
      });
    });

    notifyPopup({ action: "status", active: true, tabId });
  } catch (err) {
    console.error("Capture failed:", err);
    notifyPopup({ action: "error", message: err.message });
  }
}

async function handleStop() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (!tabId) return;

  delete activeTabs[tabId];

  chrome.tabs.sendMessage(tabId, { action: "stopVisualization" }).catch(() => {});

  try {
    await chrome.runtime.sendMessage({ action: "stopCapture" });
  } catch (e) {
    // offscreen document may already be closed
  }
  await teardownOffscreenDocument();

  notifyPopup({ action: "status", active: false, tabId });
}

function notifyPopup(msg) {
  if (popupPort) {
    try { popupPort.postMessage(msg); } catch (e) {}
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "isActive") {
    const tabId = msg.tabId;
    sendResponse({ active: !!activeTabs[tabId] });
    return true;
  }

  if (msg.action === "stopFromOverlay") {
    const tabId = sender.tab?.id;
    if (tabId) {
      delete activeTabs[tabId];
      chrome.runtime.sendMessage({ action: "stopCapture" }, () => {
        teardownOffscreenDocument();
      });
      notifyPopup({ action: "status", active: false, tabId });
    }
    sendResponse({ ok: true });
    return true;
  }
});
