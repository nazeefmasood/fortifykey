// Content Script - Form detection and auto-fill
// Runs on all pages to detect login forms and provide credentials

interface DetectedForm {
  form: HTMLFormElement;
  usernameField: HTMLInputElement | null;
  passwordFields: HTMLInputElement[];
  submitButton: HTMLElement | null;
  score: number;
}

interface CredentialItem {
  id: string;
  name: string;
  domain: string | null;
  data: {
    username?: string;
    password?: string;
  };
}

let detectedForms: DetectedForm[] = [];
let matchingItems: CredentialItem[] = [];
let overlayVisible = false;

// ===== Form Detection =====

function findLoginForms(): DetectedForm[] {
  const forms: DetectedForm[] = [];
  const allForms = document.querySelectorAll("form");

  allForms.forEach((form) => {
    const inputs = form.querySelectorAll("input");
    let usernameField: HTMLInputElement | null = null;
    const passwordFields: HTMLInputElement[] = [];

    inputs.forEach((input) => {
      const type = input.type.toLowerCase();
      const name = (input.name || input.id || "").toLowerCase();
      const autocomplete = (input.autocomplete || "").toLowerCase();

      if (type === "password") {
        passwordFields.push(input);
      } else if (
        type === "email" ||
        type === "text" ||
        type === "tel"
      ) {
        // Check if it looks like a username/email field
        if (
          autocomplete.includes("email") ||
          autocomplete.includes("username") ||
          autocomplete.includes("tel") ||
          name.includes("email") ||
          name.includes("user") ||
          name.includes("login") ||
          name.includes("phone") ||
          name.includes("mobile")
        ) {
          usernameField = input;
        }
      }
    });

    // Only consider forms with password fields
    if (passwordFields.length === 0) return;

    // Find submit button
    let submitButton: HTMLElement | null =
      form.querySelector('button[type="submit"]') ||
      form.querySelector('input[type="submit"]');

    if (!submitButton) {
      // Look for button-like elements
      const buttons = form.querySelectorAll("button");
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || "";
        if (
          text.includes("sign in") ||
          text.includes("login") ||
          text.includes("log in") ||
          text.includes("submit")
        ) {
          submitButton = btn;
          break;
        }
      }
    }

    // Score the form based on heuristics
    let score = 0;
    if (passwordFields.length > 0) score += 30;
    if (usernameField) score += 20;
    if (submitButton) score += 20;
    if (form.method?.toLowerCase() === "post") score += 15;
    if (form.action && !form.action.includes("#")) score += 15;

    forms.push({
      form,
      usernameField,
      passwordFields,
      submitButton,
      score,
    });
  });

  // Also check for password fields outside forms
  const standalonePasswords = document.querySelectorAll('input[type="password"]');
  standalonePasswords.forEach((pw) => {
    const pwInput = pw as HTMLInputElement;
    if (pwInput.form) return; // Already in a form

    // Find nearby text/email input
    const container = pw.closest("div, section, main");
    if (container) {
      const nearbyText = container.querySelector(
        'input[type="email"], input[type="text"], input[type="tel"]'
      );

      forms.push({
        form: null as unknown as HTMLFormElement,
        usernameField: nearbyText as HTMLInputElement | null,
        passwordFields: [pwInput],
        submitButton: null,
        score: 25,
      });
    }
  });

  return forms.sort((a, b) => b.score - a.score);
}

// ===== Overlay UI =====

function createOverlayIcon(field: HTMLInputElement, items: CredentialItem[]) {
  // Remove existing overlay
  const existing = field.parentElement?.querySelector(".fortifykey-overlay");
  if (existing) existing.remove();

  // Create overlay container
  const overlay = document.createElement("div");
  overlay.className = "fortifykey-overlay";
  overlay.innerHTML = `
    <div class="fortifykey-icon" title="FortifyKey">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#628EFB" stroke="#fff" stroke-width="2"/>
      </svg>
    </div>
    <div class="fortifykey-dropdown">
      <div class="fortifykey-dropdown-header">FortifyKey</div>
      <div class="fortifykey-dropdown-items"></div>
    </div>
  `;

  // Populate dropdown items
  const itemsContainer = overlay.querySelector(".fortifykey-dropdown-items");
  if (items.length === 0) {
    itemsContainer!.innerHTML = `
      <div class="fortifykey-empty">No matching credentials</div>
    `;
  } else {
    items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "fortifykey-item";
      itemEl.innerHTML = `
        <div class="fortifykey-item-name">${escapeHtml(item.name)}</div>
        <div class="fortifykey-item-username">${escapeHtml(item.data.username || "")}</div>
      `;
      itemEl.addEventListener("click", () => fillCredentials(item));
      itemsContainer!.appendChild(itemEl);
    });
  }

  // Position overlay
  const fieldRect = field.getBoundingClientRect();
  overlay.style.top = `${fieldRect.top + window.scrollY}px`;
  overlay.style.left = `${fieldRect.right - 30}px`;

  // Toggle dropdown on icon click
  const icon = overlay.querySelector(".fortifykey-icon");
  icon?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = overlay.querySelector(".fortifykey-dropdown");
    dropdown?.classList.toggle("fortifykey-visible");
  });

  document.body.appendChild(overlay);
  overlayVisible = true;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== Auto-Fill =====

async function fillCredentials(item: CredentialItem) {
  const bestForm = detectedForms[0];
  if (!bestForm) return;

  const { usernameField, passwordFields } = bestForm;

  if (usernameField && item.data.username) {
    fillField(usernameField, item.data.username);
  }

  if (passwordFields.length > 0 && item.data.password) {
    const password = item.data.password;
    passwordFields.forEach((pw) => fillField(pw, password));
  }

  // Close dropdown
  const dropdowns = document.querySelectorAll(".fortifykey-dropdown");
  dropdowns.forEach((d) => d.classList.remove("fortifykey-visible"));

  // Notify service worker of usage
  chrome.runtime.sendMessage({
    type: "CREDENTIAL_USED",
    payload: { itemId: item.id },
  });
}

function fillField(field: HTMLInputElement, value: string) {
  // Set value
  field.value = value;

  // Trigger events to notify frameworks
  const events = ["input", "change", "blur"];
  events.forEach((eventType) => {
    const event = new Event(eventType, { bubbles: true });
    field.dispatchEvent(event);
  });

  // For React apps
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// ===== Credential Capture =====

let capturedCredentials: { url: string; username: string; password: string } | null = null;

function setupCredentialCapture() {
  detectedForms.forEach(({ form, usernameField, passwordFields }) => {
    if (!form) return;

    form.addEventListener("submit", () => {
      if (!usernameField || passwordFields.length === 0) return;

      const username = usernameField.value;
      const password = passwordFields[0]?.value;

      if (username && password) {
        capturedCredentials = {
          url: window.location.href,
          username,
          password,
        };

        // Ask service worker if this is a new credential
        chrome.runtime.sendMessage(
          { type: "CHECK_NEW_CREDENTIAL", payload: { domain: window.location.hostname } },
          (response) => {
            if (response?.isNew) {
              showSavePrompt();
            }
          }
        );
      }
    });
  });
}

function showSavePrompt() {
  if (!capturedCredentials) return;

  // Remove existing prompt
  const existing = document.getElementById("fortifykey-save-prompt");
  if (existing) existing.remove();

  const prompt = document.createElement("div");
  prompt.id = "fortifykey-save-prompt";
  prompt.innerHTML = `
    <div class="fortifykey-save-content">
      <div class="fortifykey-save-title">Save password with FortifyKey?</div>
      <div class="fortifykey-save-subtitle">${escapeHtml(capturedCredentials.username)}</div>
      <div class="fortifykey-save-buttons">
        <button class="fortifykey-save-no">Not now</button>
        <button class="fortifykey-save-yes">Save</button>
      </div>
    </div>
  `;

  prompt.querySelector(".fortifykey-save-no")?.addEventListener("click", () => {
    prompt.remove();
    capturedCredentials = null;
  });

  prompt.querySelector(".fortifykey-save-yes")?.addEventListener("click", async () => {
    if (!capturedCredentials) return;

    await chrome.runtime.sendMessage({
      type: "ADD_ITEM",
      payload: {
        itemType: "login",
        name: window.location.hostname,
        domain: window.location.href,
        payload: {
          urls: [window.location.href],
          username: capturedCredentials.username,
          password: capturedCredentials.password,
        },
      },
    });

    prompt.remove();
    capturedCredentials = null;
  });

  document.body.appendChild(prompt);
}

// ===== Main Logic =====

async function init() {
  // Detect forms
  detectedForms = findLoginForms();

  if (detectedForms.length === 0) return;

  // Check if vault is unlocked and get matching items
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_MATCHING_ITEMS",
      payload: { domain: window.location.href },
    });

    if (response?.items) {
      matchingItems = response.items;

      // Show overlay on username field of best form
      const bestForm = detectedForms[0];
      if (bestForm.usernameField && matchingItems.length > 0) {
        createOverlayIcon(bestForm.usernameField, matchingItems);
      }
    }

    // Setup credential capture
    setupCredentialCapture();
  } catch (err) {
    // Vault might be locked
    console.log("FortifyKey: Could not get credentials", err);
  }
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Re-scan on dynamic content changes
const observer = new MutationObserver(() => {
  const newForms = findLoginForms();
  if (newForms.length !== detectedForms.length) {
    detectedForms = newForms;
    init();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from popup/service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FILL_CREDENTIALS") {
    const item = message.payload.item as CredentialItem;
    fillCredentials(item);
    sendResponse({ success: true });
  }
  return false;
});
