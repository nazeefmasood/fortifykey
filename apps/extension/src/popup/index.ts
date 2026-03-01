// Popup Entry Point
// Renders the extension popup UI

import { sendMessage } from "../lib/messaging";
import { generatePassword, type GeneratorConfig } from "../lib/password-generator";

interface VaultItem {
  id: string;
  name: string;
  domain: string | null;
  item_type: string;
  data: {
    username?: string;
    password?: string;
  };
}

interface VaultState {
  isUnlocked: boolean;
  hasVault: boolean;
  userId: string | null;
  email: string | null;
  itemCount: number;
}

type View = "lock" | "vault" | "generator";

let currentView: View = "lock";
let vaultState: VaultState | null = null;
let items: VaultItem[] = [];
let searchQuery = "";
let activeTab: "all" | "matching" = "matching";
let generatorConfig: GeneratorConfig = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};
let generatedPassword = "";

// ===== State Management =====

async function checkState() {
  try {
    vaultState = await sendMessage<VaultState>("GET_VAULT_STATE");
    if (!vaultState.hasVault || !vaultState.isUnlocked) {
      currentView = "lock";
    } else {
      currentView = "vault";
      await loadItems();
    }
    render();
  } catch (err) {
    console.error("Failed to check state:", err);
    currentView = "lock";
    render();
  }
}

async function loadItems() {
  try {
    const response = await sendMessage<{ items: VaultItem[] }>("GET_VAULT_ITEMS");
    items = response.items || [];
  } catch (err) {
    console.error("Failed to load items:", err);
    items = [];
  }
}

async function loadMatchingItems() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      items = [];
      return;
    }

    const response = await sendMessage<{ items: VaultItem[] }>("GET_MATCHING_ITEMS", {
      domain: tab.url,
    });
    items = response.items || [];
  } catch (err) {
    console.error("Failed to load matching items:", err);
    items = [];
  }
}

// ===== Render Functions =====

function render() {
  const app = document.getElementById("app");
  if (!app) return;

  switch (currentView) {
    case "lock":
      app.innerHTML = renderLockScreen();
      setupLockEvents();
      break;
    case "vault":
      app.innerHTML = renderVault();
      setupVaultEvents();
      break;
    case "generator":
      app.innerHTML = renderGenerator();
      setupGeneratorEvents();
      break;
  }
}

function renderLockScreen(): string {
  const isNew = !vaultState?.hasVault;
  return `
    <div class="lock-screen">
      <div class="lock-logo">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#628EFB" stroke="#fff" stroke-width="2"/>
        </svg>
      </div>
      <h1 class="lock-title">${isNew ? "Create Master Password" : "Unlock Vault"}</h1>
      <p class="lock-subtitle">${isNew ? "This password will encrypt all your data" : "Enter your master password to continue"}</p>
      <input type="password" id="masterPassword" class="lock-input" placeholder="Master password" autofocus>
      ${isNew ? '<input type="password" id="confirmPassword" class="lock-input" placeholder="Confirm password">' : ""}
      <button id="unlockBtn" class="lock-button">${isNew ? "Create Vault" : "Unlock"}</button>
      <div id="lockError" class="lock-error"></div>
    </div>
  `;
}

function renderVault(): string {
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.data.username?.toLowerCase().includes(q) ||
      item.domain?.toLowerCase().includes(q)
    );
  });

  return `
    <div class="main-view">
      <div class="header">
        <div class="header-top">
          <div class="header-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#fff" stroke="#fff" stroke-width="2"/>
            </svg>
            <span class="header-title">FortifyKey</span>
          </div>
          <div class="header-actions">
            <button class="header-btn" id="generatorBtn" title="Password Generator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v18M3 12h18"/>
              </svg>
            </button>
            <button class="header-btn" id="lockBtn" title="Lock Vault">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="search-container">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" id="searchInput" class="search-input" placeholder="Search vault..." value="${searchQuery}">
        </div>
      </div>
      <div class="tabs">
        <button class="tab ${activeTab === "matching" ? "active" : ""}" data-tab="matching">Matching</button>
        <button class="tab ${activeTab === "all" ? "active" : ""}" data-tab="all">All Items</button>
      </div>
      <div class="item-list">
        ${filteredItems.length === 0 ? renderEmptyState() : filteredItems.map(renderItem).join("")}
      </div>
      <div class="footer">
        <span class="footer-status">${items.length} items</span>
        <a href="#" class="footer-link" id="openWebApp">Open Web App</a>
      </div>
    </div>
  `;
}

function renderItem(item: VaultItem): string {
  return `
    <div class="item" data-id="${item.id}">
      <div class="item-icon">${item.name.charAt(0).toUpperCase()}</div>
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-username">${escapeHtml(item.data.username || "")}</div>
      </div>
      <div class="item-actions">
        <button class="item-action copy" data-action="copy" title="Copy password">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="item-action fill" data-action="fill" title="Auto-fill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <div class="empty-icon">🔐</div>
      <p class="empty-text">No passwords found</p>
    </div>
  `;
}

function renderGenerator(): string {
  generatedPassword = generatePassword(generatorConfig);

  return `
    <div class="main-view">
      <div class="header">
        <div class="header-top">
          <div class="header-logo">
            <button class="header-btn" id="backBtn" style="margin-right: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <span class="header-title">Password Generator</span>
          </div>
        </div>
      </div>
      <div class="generator-panel">
        <div class="generator-length">
          <div class="generator-label">
            <span>Length</span>
            <span>${generatorConfig.length}</span>
          </div>
          <input type="range" class="length-slider" id="lengthSlider" min="8" max="64" value="${generatorConfig.length}">
        </div>
        <div class="generator-options">
          <label class="option-toggle">
            <input type="checkbox" id="uppercase" ${generatorConfig.uppercase ? "checked" : ""}>
            <span class="option-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </span>
            <span class="option-label">A-Z</span>
          </label>
          <label class="option-toggle">
            <input type="checkbox" id="lowercase" ${generatorConfig.lowercase ? "checked" : ""}>
            <span class="option-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </span>
            <span class="option-label">a-z</span>
          </label>
          <label class="option-toggle">
            <input type="checkbox" id="numbers" ${generatorConfig.numbers ? "checked" : ""}>
            <span class="option-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </span>
            <span class="option-label">0-9</span>
          </label>
          <label class="option-toggle">
            <input type="checkbox" id="symbols" ${generatorConfig.symbols ? "checked" : ""}>
            <span class="option-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </span>
            <span class="option-label">!@#</span>
          </label>
        </div>
        <div class="generated-password" id="generatedPassword">${generatedPassword}</div>
        <div class="generator-buttons">
          <button class="generator-btn regenerate" id="regenerateBtn">Regenerate</button>
          <button class="generator-btn copy" id="copyBtn">Copy</button>
        </div>
      </div>
    </div>
  `;
}

// ===== Event Handlers =====

function setupLockEvents() {
  const unlockBtn = document.getElementById("unlockBtn");
  const masterInput = document.getElementById("masterPassword") as HTMLInputElement;
  const confirmInput = document.getElementById("confirmPassword") as HTMLInputElement;
  const errorEl = document.getElementById("lockError");

  unlockBtn?.addEventListener("click", async () => {
    const password = masterInput?.value;
    if (!password) {
      errorEl!.textContent = "Please enter a password";
      return;
    }

    if (confirmInput && password !== confirmInput.value) {
      errorEl!.textContent = "Passwords do not match";
      return;
    }

    try {
      unlockBtn.setAttribute("disabled", "true");
      unlockBtn.textContent = "Unlocking...";

      await sendMessage("UNLOCK_VAULT", { masterPassword: password });
      currentView = "vault";
      await loadMatchingItems();
      render();
    } catch (err) {
      errorEl!.textContent = (err as Error).message;
      unlockBtn.removeAttribute("disabled");
      unlockBtn.textContent = vaultState?.hasVault ? "Unlock" : "Create Vault";
    }
  });

  masterInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      unlockBtn?.click();
    }
  });
}

function setupVaultEvents() {
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;
  const generatorBtn = document.getElementById("generatorBtn");
  const lockBtn = document.getElementById("lockBtn");
  const openWebApp = document.getElementById("openWebApp");
  const tabs = document.querySelectorAll(".tab");

  searchInput?.addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    render();
  });

  generatorBtn?.addEventListener("click", () => {
    currentView = "generator";
    render();
  });

  lockBtn?.addEventListener("click", async () => {
    await sendMessage("LOCK_VAULT");
    currentView = "lock";
    render();
  });

  openWebApp?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "https://fortifykey.app" });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      activeTab = tab.getAttribute("data-tab") as "all" | "matching";
      if (activeTab === "all") {
        await loadItems();
      } else {
        await loadMatchingItems();
      }
      render();
    });
  });

  // Item actions
  document.querySelectorAll(".item").forEach((item) => {
    const id = item.getAttribute("data-id");

    item.querySelector('[data-action="copy"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const vaultItem = items.find((i) => i.id === id);
      if (vaultItem?.data.password) {
        await navigator.clipboard.writeText(vaultItem.data.password);
        showToast("Password copied!");
      }
    });

    item.querySelector('[data-action="fill"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const vaultItem = items.find((i) => i.id === id);
      if (vaultItem) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "FILL_CREDENTIALS",
            payload: { item: vaultItem },
          });
          showToast("Credentials filled!");
          window.close();
        }
      }
    });
  });
}

function setupGeneratorEvents() {
  const backBtn = document.getElementById("backBtn");
  const lengthSlider = document.getElementById("lengthSlider") as HTMLInputElement;
  const uppercaseCb = document.getElementById("uppercase") as HTMLInputElement;
  const lowercaseCb = document.getElementById("lowercase") as HTMLInputElement;
  const numbersCb = document.getElementById("numbers") as HTMLInputElement;
  const symbolsCb = document.getElementById("symbols") as HTMLInputElement;
  const regenerateBtn = document.getElementById("regenerateBtn");
  const copyBtn = document.getElementById("copyBtn");

  backBtn?.addEventListener("click", () => {
    currentView = "vault";
    render();
  });

  const updatePassword = () => {
    generatedPassword = generatePassword(generatorConfig);
    const el = document.getElementById("generatedPassword");
    if (el) el.textContent = generatedPassword;
  };

  lengthSlider?.addEventListener("input", () => {
    generatorConfig.length = parseInt(lengthSlider.value);
    document.querySelector(".generator-length .generator-label span:last-child")!.textContent = String(generatorConfig.length);
    updatePassword();
  });

  uppercaseCb?.addEventListener("change", () => {
    generatorConfig.uppercase = uppercaseCb.checked;
    updatePassword();
  });

  lowercaseCb?.addEventListener("change", () => {
    generatorConfig.lowercase = lowercaseCb.checked;
    updatePassword();
  });

  numbersCb?.addEventListener("change", () => {
    generatorConfig.numbers = numbersCb.checked;
    updatePassword();
  });

  symbolsCb?.addEventListener("change", () => {
    generatorConfig.symbols = symbolsCb.checked;
    updatePassword();
  });

  regenerateBtn?.addEventListener("click", updatePassword);

  copyBtn?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(generatedPassword);
    showToast("Password copied!");
  });
}

// ===== Utilities =====

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message: string) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// ===== Init =====

checkState();

// Listen for vault lock events
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "VAULT_LOCKED") {
    currentView = "lock";
    render();
  }
  return false;
});
