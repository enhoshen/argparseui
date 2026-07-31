// State & Config
let form = null;
let commandDisplayCode = null;
let scriptArguments = [];
let baseCommand = [];

let historySet = new Set();
let pinnedSet = new Set();
let commentsMap = {};

// Utility Functions
const stringToHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const updateCommentSize = (input) => {
  const textLen =
    input.value.length ||
    (input.placeholder ? input.placeholder.length : 6);
  input.size = Math.max(textLen, 4);
};

const updateCommandDisplay = () => {
  if (!form || !commandDisplayCode) return "";
  const formData = new FormData(form);
  const currentCommandParts = [...baseCommand];

  formData.forEach((value, key) => {
    const argDef = scriptArguments.find((arg) => arg.dest === key);
    if (!argDef) return;

    if (argDef.type === "checkbox") {
      currentCommandParts.push(`--${key}`);
    } else if (value !== "") {
      currentCommandParts.push(`--${key}`);
      currentCommandParts.push(value);
    }
  });
  const cmdStr = currentCommandParts.join(" ");
  commandDisplayCode.textContent = cmdStr;
  return cmdStr;
};

// Storage & History State Management
const loadHistory = () => {
  try {
    const storedHistory = localStorage.getItem("argparseui_history");
    if (storedHistory) {
      const parsed = JSON.parse(storedHistory);
      if (Array.isArray(parsed)) {
        historySet = new Set(parsed);
      }
    }
    const storedPinned = localStorage.getItem("argparseui_pinned");
    if (storedPinned) {
      const parsed = JSON.parse(storedPinned);
      if (Array.isArray(parsed)) {
        pinnedSet = new Set(parsed);
      }
    }
    const storedComments = localStorage.getItem("argparseui_comments");
    if (storedComments) {
      commentsMap = JSON.parse(storedComments) || {};
    }
  } catch (e) {
    console.error("Failed to load history from localStorage:", e);
  }
};

const saveHistory = () => {
  try {
    localStorage.setItem(
      "argparseui_history",
      JSON.stringify(Array.from(historySet)),
    );
    localStorage.setItem(
      "argparseui_pinned",
      JSON.stringify(Array.from(pinnedSet)),
    );
    localStorage.setItem("argparseui_comments", JSON.stringify(commentsMap));
  } catch (e) {
    console.error("Failed to save history to localStorage:", e);
  }
};

const addCommandToHistory = (cmdStr) => {
  if (!cmdStr || cmdStr.trim() === "") return;
  historySet.delete(cmdStr);
  historySet.add(cmdStr);
  saveHistory();
  renderHistory();
};

const deleteCommandFromHistory = (cmdStr) => {
  historySet.delete(cmdStr);
  pinnedSet.delete(cmdStr);
  delete commentsMap[cmdStr];
  saveHistory();
  renderHistory();
};

const togglePinCommand = (cmdStr) => {
  if (pinnedSet.has(cmdStr)) {
    pinnedSet.delete(cmdStr);
  } else {
    pinnedSet.add(cmdStr);
  }
  saveHistory();
  renderHistory();
};

const clearUnpinnedHistory = () => {
  historySet = new Set(pinnedSet);
  for (const key of Object.keys(commentsMap)) {
    if (!pinnedSet.has(key)) {
      delete commentsMap[key];
    }
  }
  saveHistory();
  renderHistory();
};

// Form Parsing & Population
const parseAndPopulateForm = (cmdStr) => {
  const baseStr = baseCommand.join(" ");
  let argsStr = cmdStr;
  if (cmdStr.startsWith(baseStr)) {
    argsStr = cmdStr.slice(baseStr.length).trim();
  }

  const tokens = [];
  const tokenRegex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let tMatch;
  while ((tMatch = tokenRegex.exec(argsStr)) !== null) {
    tokens.push(tMatch[1] ?? tMatch[2] ?? tMatch[3]);
  }

  const parsedArgs = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const argDef = scriptArguments.find((a) => a.dest === key);
      if (argDef && argDef.type === "checkbox") {
        parsedArgs[key] = true;
      } else {
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith("--")) {
          parsedArgs[key] = tokens[i + 1];
          i++;
        } else {
          parsedArgs[key] = true;
        }
      }
    }
  }

  scriptArguments.forEach((arg) => {
    const el = document.getElementById(arg.dest);
    if (!el) return;

    if (parsedArgs.hasOwnProperty(arg.dest)) {
      const val = parsedArgs[arg.dest];
      if (arg.type === "checkbox") {
        el.checked = true;
      } else if (el.tagName === "SELECT") {
        el.value = val;
      } else {
        el.value = val === true ? "" : val;
      }
    } else {
      if (arg.type === "checkbox") {
        el.checked = false;
      } else if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    }
  });

  updateCommandDisplay();
};

// DOM Rendering for History Items
const createHistoryItemElement = (cmdStr, isPinned) => {
  const itemEl = document.createElement("div");
  itemEl.className = `history-item-bar ${isPinned ? "pinned" : ""}`;

  const hue = stringToHash(cmdStr) % 360;
  itemEl.style.backgroundColor = isPinned
    ? `hsl(${hue}, 65%, 90%)`
    : `hsl(${hue}, 45%, 95%)`;
  itemEl.style.borderColor = isPinned
    ? `hsl(${hue}, 55%, 75%)`
    : `hsl(${hue}, 35%, 85%)`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "history-item-content";

  const cmdBtn = document.createElement("button");
  cmdBtn.type = "button";
  cmdBtn.className = "history-cmd-btn";
  cmdBtn.title = "Click to fill form with this command";
  cmdBtn.innerHTML = `<i class="fas fa-terminal history-icon"></i><code class="history-cmd-text"></code>`;
  cmdBtn.querySelector(".history-cmd-text").textContent = cmdStr;
  cmdBtn.addEventListener("click", () => parseAndPopulateForm(cmdStr));

  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.className = "history-comment-input";
  commentInput.placeholder = "Desc";
  commentInput.value = commentsMap[cmdStr] || "";
  updateCommentSize(commentInput);

  commentInput.addEventListener("click", (e) => e.stopPropagation());
  commentInput.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val.trim() === "") {
      delete commentsMap[cmdStr];
    } else {
      commentsMap[cmdStr] = val;
    }
    updateCommentSize(e.target);
    saveHistory();
  });

  contentDiv.appendChild(cmdBtn);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "history-actions";

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.className = "btn-history-action btn-history-run";
  runBtn.title = "Run command now";
  runBtn.innerHTML = '<i class="fas fa-play"></i>';
  runBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    parseAndPopulateForm(cmdStr);
    if (form) form.submit();
  });

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = `btn-history-action btn-pin ${isPinned ? "active" : ""}`;
  pinBtn.title = isPinned ? "Unpin command" : "Pin to top";
  pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePinCommand(cmdStr);
  });

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn-history-action btn-delete";
  delBtn.title = "Delete from history";
  delBtn.innerHTML = '<i class="fas fa-trash"></i>';
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteCommandFromHistory(cmdStr);
  });

  actionsDiv.appendChild(runBtn);
  actionsDiv.appendChild(pinBtn);
  actionsDiv.appendChild(delBtn);

  itemEl.appendChild(commentInput);
  itemEl.appendChild(contentDiv);
  itemEl.appendChild(actionsDiv);

  return itemEl;
};

const renderHistory = () => {
  const historyListEl = document.getElementById("history-list");
  if (!historyListEl) return;

  historyListEl.innerHTML = "";

  const allCmds = Array.from(historySet).reverse();
  const pinnedCmds = allCmds.filter((cmd) => pinnedSet.has(cmd));
  const unpinnedCmds = allCmds.filter((cmd) => !pinnedSet.has(cmd));
  const sortedCmds = [...pinnedCmds, ...unpinnedCmds];

  if (sortedCmds.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "history-empty";
    emptyEl.innerHTML =
      '<i class="fas fa-history"></i> No command history yet.';
    historyListEl.appendChild(emptyEl);
    return;
  }

  sortedCmds.forEach((cmdStr) => {
    const itemEl = createHistoryItemElement(cmdStr, pinnedSet.has(cmdStr));
    historyListEl.appendChild(itemEl);
  });
};

// Clipboard Paste Setup
const handlePasteClick = async (button) => {
  try {
    const text = await navigator.clipboard.readText();
    const inputRow = button.parentElement;
    let targetInput = null;
    if (inputRow) {
      targetInput = inputRow.querySelector('input[type="search"], select');
    }

    if (targetInput) {
      targetInput.value = text;
      if (targetInput.tagName === "SELECT") {
        const option = targetInput.querySelector(`option[value="${text}"]`);
        if (option) {
          option.selected = true;
        }
      }
      const eventType = targetInput.tagName === "SELECT" ? "change" : "input";
      const event = new Event(eventType, { bubbles: true });
      targetInput.dispatchEvent(event);
    } else {
      console.warn("Target input element not found for paste button.");
    }
  } catch (err) {
    console.error("Failed to read clipboard content: ", err);
    alert("Failed to paste. Please grant clipboard access or try again.");
  }
};

// Main Initialization Handler
const initCommandRunner = () => {
  form = document.querySelector("form");
  const displayContainer = document.getElementById("dynamic-command-display");
  commandDisplayCode = displayContainer ? displayContainer.querySelector("code") : null;

  if (window.APP_CONFIG) {
    scriptArguments = window.APP_CONFIG.scriptArguments || [];
    baseCommand = window.APP_CONFIG.baseCommand || [];
  }

  if (form) {
    const formElements = form.querySelectorAll("input, select");
    formElements.forEach((element) => {
      element.addEventListener("input", updateCommandDisplay);
      element.addEventListener("change", updateCommandDisplay);
    });

    form.addEventListener("submit", () => {
      const cmdStr = updateCommandDisplay();
      addCommandToHistory(cmdStr);
    });
  }

  const pasteButtons = document.querySelectorAll(".btn-paste");
  pasteButtons.forEach((button) => {
    button.addEventListener("click", () => handlePasteClick(button));
  });

  const deleteHistory = document.getElementById("delete-history");
  if (deleteHistory) {
    deleteHistory.addEventListener("click", clearUnpinnedHistory);
  }

  loadHistory();

  const outputOrError = document.querySelector(".output-section");
  const currentCmd = updateCommandDisplay();
  if (outputOrError && currentCmd) {
    addCommandToHistory(currentCmd);
  } else {
    renderHistory();
  }
};

document.addEventListener("DOMContentLoaded", initCommandRunner);
