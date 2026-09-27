const DEFAULT_SETTINGS = {
  holdKeyCode: "ArrowRight",
  holdKeyLabel: "Right Arrow",
  holdSpeed: 2,
  restoreMode: "normal"
};

const DEFERRED_SHORTCUT_KEY_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown"
]);

const HOLD_DELAY_MS_FOR_DEFERRED_SHORTCUTS = 220;
const SEEK_STEP_SECONDS = 5;
const VOLUME_STEP = 0.05;

let settings = { ...DEFAULT_SETTINGS };
let isHolding = false;
let activeVideo = null;
let previousRate = 1;
let holdTimer = 0;
let pendingVideo = null;

chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
  settings = normalizeSettings(items);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  const nextSettings = { ...settings };
  for (const [key, change] of Object.entries(changes)) {
    nextSettings[key] = change.newValue;
  }
  settings = normalizeSettings(nextSettings);

  if (isHolding && activeVideo) {
    setPlaybackRate(activeVideo, settings.holdSpeed);
  }
});

function normalizeSettings(rawSettings) {
  const speed = Number(rawSettings.holdSpeed);

  return {
    holdKeyCode: typeof rawSettings.holdKeyCode === "string" && rawSettings.holdKeyCode
      ? rawSettings.holdKeyCode
      : DEFAULT_SETTINGS.holdKeyCode,
    holdKeyLabel: typeof rawSettings.holdKeyLabel === "string" && rawSettings.holdKeyLabel
      ? rawSettings.holdKeyLabel
      : DEFAULT_SETTINGS.holdKeyLabel,
    holdSpeed: Number.isFinite(speed) ? clamp(speed, 0.25, 16) : DEFAULT_SETTINGS.holdSpeed,
    restoreMode: rawSettings.restoreMode === "previous" ? "previous" : "normal"
  };
}

function onKeyDown(event) {
  if (!matchesHoldKey(event) || isEditableTarget(event.target)) {
    return;
  }

  const video = getBestVideo();
  if (!video) {
    return;
  }

  if (shouldDeferNativeShortcut(event)) {
    swallow(event);

    if (isHolding) {
      setPlaybackRate(activeVideo || video, settings.holdSpeed);
      return;
    }

    startDelayedHold(video);
    return;
  }

  swallow(event);
  startImmediateHold(video);
}

function onKeyUp(event) {
  if (!matchesHoldKey(event)) {
    return;
  }

  if (shouldDeferNativeShortcut(event)) {
    swallow(event);
    const video = pendingVideo || activeVideo || getBestVideo();
    const wasWaitingForHold = cancelDelayedHold();

    if (isHolding) {
      restorePlaybackRate();
    } else if (wasWaitingForHold) {
      replayNativeShortcut(event.code, video);
    }
    return;
  }

  swallow(event);
  restorePlaybackRate();
}

function startImmediateHold(video) {
  if (!isHolding) {
    activateHold(video);
  }

  setPlaybackRate(activeVideo || video, settings.holdSpeed);
}

function startDelayedHold(video) {
  if (holdTimer || isHolding) {
    return;
  }

  pendingVideo = video;
  holdTimer = window.setTimeout(() => {
    holdTimer = 0;
    activateHold(pendingVideo || getBestVideo());
    pendingVideo = null;
  }, HOLD_DELAY_MS_FOR_DEFERRED_SHORTCUTS);
}

function activateHold(video) {
  if (!video) {
    return;
  }

  isHolding = true;
  activeVideo = video;
  previousRate = Number.isFinite(video.playbackRate) ? video.playbackRate : 1;
  setPlaybackRate(video, settings.holdSpeed);
}

function cancelDelayedHold() {
  if (!holdTimer) {
    return false;
  }

  window.clearTimeout(holdTimer);
  holdTimer = 0;
  pendingVideo = null;
  return true;
}

function matchesHoldKey(event) {
  return event.code === settings.holdKeyCode;
}

function shouldDeferNativeShortcut(event) {
  return DEFERRED_SHORTCUT_KEY_CODES.has(event.code);
}

function replayNativeShortcut(code, video) {
  if (!video) {
    return;
  }

  if (code === "ArrowRight") {
    seekBy(video, SEEK_STEP_SECONDS);
  } else if (code === "ArrowLeft") {
    seekBy(video, -SEEK_STEP_SECONDS);
  } else if (code === "ArrowUp") {
    setVolume(video, video.volume + VOLUME_STEP);
  } else if (code === "ArrowDown") {
    setVolume(video, video.volume - VOLUME_STEP);
  }
}

function seekBy(video, seconds) {
  const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
  video.currentTime = clamp(video.currentTime + seconds, 0, duration);
}

function setVolume(video, volume) {
  video.volume = clamp(volume, 0, 1);
  video.muted = video.volume === 0;
}

function restorePlaybackRate() {
  if (!isHolding) {
    return;
  }

  const video = activeVideo || getBestVideo();
  if (video) {
    const rate = settings.restoreMode === "previous" ? previousRate : 1;
    setPlaybackRate(video, rate || 1);
  }

  isHolding = false;
  activeVideo = null;
  previousRate = 1;
}

function getBestVideo() {
  const fullscreenVideo = document.fullscreenElement
    ? document.fullscreenElement.querySelector?.("video")
    : null;

  if (fullscreenVideo) {
    return fullscreenVideo;
  }

  const videos = Array.from(document.querySelectorAll("video"));
  return videos.find((video) => !video.paused)
    || videos.find((video) => video.readyState > HTMLMediaElement.HAVE_NOTHING)
    || videos[0]
    || null;
}

function setPlaybackRate(video, rate) {
  video.playbackRate = clamp(rate, 0.25, 16);
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest([
    "input",
    "textarea",
    "select",
    "[contenteditable='']",
    "[contenteditable='true']",
    "[role='textbox']"
  ].join(",")));
}

function swallow(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cancelAndRestore() {
  cancelDelayedHold();
  restorePlaybackRate();
}

window.addEventListener("keydown", onKeyDown, true);
window.addEventListener("keyup", onKeyUp, true);
window.addEventListener("blur", cancelAndRestore, true);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAndRestore();
  }
});
