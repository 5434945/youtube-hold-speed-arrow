const DEFAULT_SETTINGS = {
  holdKeyCode: "ArrowRight",
  holdKeyLabel: "Right Arrow",
  holdSpeed: 2,
  restoreMode: "normal"
};

const KEY_LABELS = {
  ArrowLeft: "Left Arrow",
  ArrowRight: "Right Arrow",
  ArrowUp: "Up Arrow",
  ArrowDown: "Down Arrow",
  Space: "Space"
};

const settingsForm = document.querySelector("#settingsForm");
const captureKey = document.querySelector("#captureKey");
const holdSpeed = document.querySelector("#holdSpeed");
const restoreMode = document.querySelector("#restoreMode");
const statusText = document.querySelector("#status");

let selectedKey = {
  code: DEFAULT_SETTINGS.holdKeyCode,
  label: DEFAULT_SETTINGS.holdKeyLabel
};

chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
  selectedKey = {
    code: items.holdKeyCode || DEFAULT_SETTINGS.holdKeyCode,
    label: items.holdKeyLabel || DEFAULT_SETTINGS.holdKeyLabel
  };
  captureKey.textContent = selectedKey.label;
  holdSpeed.value = items.holdSpeed || DEFAULT_SETTINGS.holdSpeed;
  restoreMode.value = items.restoreMode || DEFAULT_SETTINGS.restoreMode;
});

captureKey.addEventListener("click", () => {
  captureKey.classList.add("listening");
  captureKey.textContent = "Press a key...";
  statusText.textContent = "";
});

window.addEventListener("keydown", (event) => {
  if (!captureKey.classList.contains("listening")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (isModifierOnly(event.key)) {
    statusText.textContent = "Choose a letter, number, symbol, arrow key, or function key.";
    return;
  }

  selectedKey = {
    code: event.code,
    label: displayKey(event)
  };

  captureKey.textContent = selectedKey.label;
  captureKey.classList.remove("listening");
  statusText.textContent = "";
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextSpeed = clamp(Number(holdSpeed.value), 0.25, 16);
  holdSpeed.value = nextSpeed;

  chrome.storage.sync.set({
    holdKeyCode: selectedKey.code,
    holdKeyLabel: selectedKey.label,
    holdSpeed: nextSpeed,
    restoreMode: restoreMode.value
  }, () => {
    statusText.textContent = "Saved. Refresh YouTube if the current page does not pick it up immediately.";
  });
});

function displayKey(event) {
  if (KEY_LABELS[event.code]) {
    return KEY_LABELS[event.code];
  }

  if (event.key && event.key !== " ") {
    return event.key.length === 1 ? event.key.toUpperCase() : event.key;
  }

  return event.code;
}

function isModifierOnly(key) {
  return ["Alt", "Control", "Meta", "Shift"].includes(key);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.holdSpeed;
  }

  return Math.min(Math.max(value, min), max);
}
