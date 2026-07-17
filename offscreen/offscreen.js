let audioProcessor = null;
let activeTabId = null;
let audioPort = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "startCapture") {
    activeTabId = msg.tabId;
    startAudioCapture(msg.streamId).then(() => {
      sendResponse({ ok: true });
    }).catch(err => {
      console.error("Offscreen capture failed:", err);
      sendResponse({ ok: false, error: err.message });
    });
    return true; // async response
  }

  if (msg.action === "stopCapture") {
    if (audioProcessor) {
      audioProcessor.destroy();
      audioProcessor = null;
    }
    if (audioPort) {
      audioPort.disconnect();
      audioPort = null;
    }
    activeTabId = null;
    sendResponse({ ok: true });
    return true;
  }
});

async function startAudioCapture(streamId) {
  if (audioProcessor) {
    audioProcessor.destroy();
  }

  if (activeTabId) {
    audioPort = chrome.runtime.connect({ name: "audioStream-offscreen" });
    audioPort.onDisconnect.addListener(() => {
      audioPort = null;
    });
  }

  audioProcessor = new AudioProcessor();
  await audioProcessor.init(streamId);
  console.log("[Offscreen] AudioProcessor initialized successfully. Streaming to port.");

  let frameCount = 0;
  
  // Forward audio data to the active tab's content script via Port
  audioProcessor.onData((data) => {
    if (audioPort) {
      frameCount++;
      // Log every 60 frames (~1 second) to confirm data is flowing
      if (frameCount % 60 === 1) {
        console.log("[Offscreen] Audio data flowing. Overall level:", data.overall.toFixed(3), "Bass:", data.bass.toFixed(3));
      }
      try {
        audioPort.postMessage({ action: "audioData", data: data });
      } catch (err) {
        // ignore disconnects
      }
    }
  });
}
