// State & Config
let form = null;
let commandDisplayCode = null;
let scriptArguments = [];
let baseCommand = [];

let historyMap = new Map();
let pinnedSet = new Set();
let commentsMap = {};

class Command {
  constructor(form, base) {
    this.form = form;
    this.base = base;
  }
  toString() {
    let parts = [...this.base];
    // this.form.forEach((value, key) => {
    for (const key in this.form) {
      let value = this.form[key];
      parts.push(`--${key}`);
      if (value === undefined) return;
      parts.push(value);
    }
    // });
    const cmdStr = parts.join(" ");
    return cmdStr;
  }
  toJSON() {
    return {
      form: this.form,
      base: this.base,
    };
  }
}

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
    input.value.length || (input.placeholder ? input.placeholder.length : 6);
  input.size = Math.max(textLen, 4);
};

const formToCommand = () => {
  if (!form || !commandDisplayCode) return "";
  const formData = new FormData(form);
  let formMap = new Map();
  formData.forEach((value, key) => {
    const argDef = scriptArguments.find((arg) => arg.dest === key);
    if (!argDef) return;
    if (argDef.type === "checkbox") formMap.set(key, "");
    else formMap.set(key, value);
  });
  return new Command(Object.fromEntries(formMap), baseCommand);
};

const updateCommandDisplay = () => {
  let command = formToCommand();
  commandDisplayCode.textContent = String(command);
  return command;
};

// Storage & History State Management
const loadHistory = () => {
  try {
    const storedHistory = localStorage.getItem("argparseui_history");
    if (storedHistory) {
      historyObj = new Map(JSON.parse(storedHistory));
      historyObj.forEach((value, key) => {
        historyMap.set(key, new Command(value.form, value.base));
      });
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
    localStorage.setItem("argparseui_history", JSON.stringify([...historyMap]));
    localStorage.setItem(
      "argparseui_pinned",
      JSON.stringify(Array.from(pinnedSet)),
    );
    localStorage.setItem("argparseui_comments", JSON.stringify(commentsMap));
  } catch (e) {
    console.error("Failed to save history to localStorage:", e);
  }
};

const addCommandToHistory = (command) => {
  let cmdStr = String(command);
  if (!cmdStr || cmdStr.trim() === "") return;
  historyMap.delete(cmdStr);
  historyMap.set(cmdStr, command);
  saveHistory();
  renderHistory();
};

const deleteCommandFromHistory = (cmdStr) => {
  historyMap.delete(cmdStr);
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
  let newComment = {};
  let newHistory = new Map();
  pinnedSet.forEach((key) => {
    newHistory.set(key, historyMap.get(key));
    newComment[key] = commentsMap[key];
  });
  historyMap = newHistory;
  commentsMap = newComment;
  saveHistory();
  renderHistory();
};

// Form Parsing & Population
const parseAndPopulateForm = (command) => {
  // const baseStr = baseCommand.join(" ");
  // let argsStr = cmdStr;
  // if (cmdStr.startsWith(baseStr)) {
  //   argsStr = cmdStr.slice(baseStr.length).trim();
  // }
  //
  // // TODO: argument containing spaces will be split into different
  // //  token;
  // // TODO: storing unstructured command string as whole is not a good idea
  // //  from the start, should be storing the structured arguments object,
  // //  maybe in json
  // const tokens = [];
  // const tokenRegex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  // let tMatch;
  // while ((tMatch = tokenRegex.exec(argsStr)) !== null) {
  //   tokens.push(tMatch[1] ?? tMatch[2] ?? tMatch[3]);
  // }
  //
  // const parsedArgs = {};
  // for (let i = 0; i < tokens.length; i++) {
  //   const token = tokens[i];
  //   if (token.startsWith("--")) {
  //     const key = token.slice(2);
  //     const argDef = scriptArguments.find((a) => a.dest === key);
  //     if (argDef && argDef.type === "checkbox") {
  //       parsedArgs[key] = true;
  //     } else {
  //       if (i + 1 < tokens.length && !tokens[i + 1].startsWith("--")) {
  //         parsedArgs[key] = tokens[i + 1];
  //         i++;
  //       } else {
  //         parsedArgs[key] = true;
  //       }
  //     }
  //   }
  // }

  scriptArguments.forEach((arg) => {
    const el = document.getElementById(arg.dest);
    if (!el) return;

    if (arg.dest in command.form) {
      const val = command.form[arg.dest];
      if (arg.type === "checkbox") {
        el.checked = true;
        return;
      }
      if (el.tagName === "SELECT") {
        el.value = val;
        return;
      }
      el.value = val;
    } else {
      if (arg.type === "checkbox") {
        el.checked = false;
        return;
      }
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
        return;
      }
      el.value = "";
    }
  });

  updateCommandDisplay();
};

// DOM Rendering for History Items
const createHistoryItemElement = (command, isPinned) => {
  const cmdStr = String(command);
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
  cmdBtn.addEventListener("click", () => parseAndPopulateForm(command));

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
    parseAndPopulateForm(command);
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

  const allCmds = Array.from(historyMap.values()).reverse();
  const pinnedCmds = allCmds.filter((cmd) => pinnedSet.has(String(cmd)));
  const unpinnedCmds = allCmds.filter((cmd) => !pinnedSet.has(String(cmd)));
  const sortedCmds = [...pinnedCmds, ...unpinnedCmds];

  if (sortedCmds.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "history-empty";
    emptyEl.innerHTML =
      '<i class="fas fa-history"></i> No command history yet.';
    historyListEl.appendChild(emptyEl);
    return;
  }

  sortedCmds.forEach((cmd_obj) => {
    let command = new Command(cmd_obj.form, cmd_obj.base);
    const itemEl = createHistoryItemElement(
      command,
      pinnedSet.has(String(command)),
    );
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
  commandDisplayCode = displayContainer
    ? displayContainer.querySelector("code")
    : null;

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
      const command = updateCommandDisplay();
      addCommandToHistory(command);
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
