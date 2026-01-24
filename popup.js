// Configuration object to store user settings
let config = {
  userName: "",
  userEmail: "",
  businessPhone: "",
  sheetLink: "",
  automationStatus: false,
};

// DOM elements
const setupForm = document.getElementById("setupForm");
const mainView = document.getElementById("mainView");
const configForm = document.getElementById("configForm");
const settingsBtn = document.getElementById("settingsBtn");
const closeBtn = document.getElementById("closeBtn");
const loadingState = document.getElementById("loadingState");
const successMsg = document.getElementById("successMsg");
const automationToggle = document.getElementById("automationToggle");

// Main view elements
const reminderType = document.getElementById("reminderType");
const reminderTo = document.getElementById("reminderTo");
const customBodyToggleGroup = document.getElementById("customBodyToggleGroup");
const customBodyToggle = document.getElementById("customBodyToggle");
const customBodySection = document.getElementById("customBodySection");
const customBodyText = document.getElementById("customBodyText");
const sendReminderBtn = document.getElementById("sendReminderBtn");

// n8n webhook URLs
const N8N_WELCOME_WEBHOOK = "https://gadgetejas.app.n8n.cloud/webhook/welcome";
const N8N_REMINDER_WEBHOOK =
  "https://gadgetejas.app.n8n.cloud/webhook/reminders";
const N8N_REMINDER_WP_WEBHOOK =
  "https://gadgetejas.app.n8n.cloud/webhook/reminderWp";
const N8N_ALL_REMINDER_WEBHOOK =
  "https://gadgetejas.app.n8n.cloud/webhook/allReminder";
const N8N_PAID_REMINDER_WEBHOOK =
  "https://gadgetejas.app.n8n.cloud/webhook/paidReminder";

// Initialize the extension
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  checkSetupStatus();
  setupEventListeners();
  updateToggleUI();
});

// Load configuration from Chrome storage
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["config"], (result) => {
      if (result.config) {
        config = result.config;
        // Populate form fields if config exists
        document.getElementById("userName").value = config.userName || "";
        document.getElementById("userEmail").value = config.userEmail || "";
        document.getElementById("businessPhone").value =
          config.businessPhone || "";
        document.getElementById("sheetLink").value = config.sheetLink || "";
      }
      resolve();
    });
  });
}

// Save configuration to Chrome storage
async function saveConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ config }, () => {
      resolve();
    });
  });
}

// Check if setup is complete and show appropriate view
function checkSetupStatus() {
  const isConfigured = config.userName && config.userEmail && config.sheetLink;
  if (isConfigured) {
    setupForm.classList.remove("active");
    mainView.classList.add("active");
  } else {
    setupForm.classList.add("active");
    mainView.classList.remove("active");
  }
}

// Update toggle UI based on config
function updateToggleUI() {
  if (config.automationStatus) {
    automationToggle.classList.add("active");
  } else {
    automationToggle.classList.remove("active");
  }
}

// Update Type dropdown based on To selection
function updateTypeDropdown() {
  const selectedTo = reminderTo.value;

  if (selectedTo === "paid" || selectedTo === "all") {
    // Set to "both" and disable
    reminderType.value = "both";
    reminderType.disabled = true;
    customBodyToggleGroup.style.display = "flex";
  } else {
    // Enable and allow selection
    reminderType.disabled = false;
    customBodyToggleGroup.style.display = "none";
    customBodyToggle.classList.remove("active");
    customBodySection.classList.remove("active");
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Configuration form submission
  configForm.addEventListener("submit", handleConfigSubmit);

  // Settings button
  settingsBtn.addEventListener("click", () => {
    mainView.classList.remove("active");
    setupForm.classList.add("active");
    updateToggleUI();
  });

  // Close button
  closeBtn.addEventListener("click", () => {
    window.close();
  });

  // Automation toggle
  automationToggle.addEventListener("click", () => {
    config.automationStatus = !config.automationStatus;
    updateToggleUI();
  });

  // Reminder "To" dropdown - update Type dropdown
  reminderTo.addEventListener("change", updateTypeDropdown);

  // Custom body toggle
  customBodyToggle.addEventListener("click", () => {
    customBodyToggle.classList.toggle("active");
    if (customBodyToggle.classList.contains("active")) {
      customBodySection.classList.add("active");
      customBodyText.focus();
    } else {
      customBodySection.classList.remove("active");
      customBodyText.value = "";
    }
  });

  // Send reminder button
  sendReminderBtn.addEventListener("click", handleSendReminder);
}

// Handle configuration form submission
async function handleConfigSubmit(e) {
  e.preventDefault();

  // Get form values
  config.userName = document.getElementById("userName").value.trim();
  config.userEmail = document.getElementById("userEmail").value.trim();
  config.businessPhone = document.getElementById("businessPhone").value.trim();
  config.sheetLink = document.getElementById("sheetLink").value.trim();

  // Validate Google Sheets URL
  if (!isValidGoogleSheetsUrl(config.sheetLink)) {
    showMessage("Please enter a valid Google Sheets URL", "error");
    return;
  }

  // Save to storage
  await saveConfig();

  // Send welcome webhook with automation status
  await sendWelcomeWebhook();

  // Show success message
  showMessage("✓ Configuration saved successfully!", "success");

  // Switch to main view after a short delay
  setTimeout(() => {
    checkSetupStatus();
  }, 1000);
}

// Send welcome webhook when setup is saved
async function sendWelcomeWebhook() {
  try {
    const payload = {
      url: config.sheetLink,
      automationStatus: config.automationStatus.toString(),
      name: config.userName,
    };

    console.log("Sending to welcome webhook:", payload);

    const response = await fetch(N8N_WELCOME_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Welcome webhook failed:", response.status);
    } else {
      console.log("Welcome webhook sent successfully");
    }
  } catch (error) {
    console.error("Error sending welcome webhook:", error);
  }
}

// Handle send reminder button click
async function handleSendReminder() {
  if (!config.sheetLink) {
    showMessage("Please configure your Google Sheet first", "error");
    return;
  }

  const type = reminderType.value; // email, whatsapp, both
  const to = reminderTo.value; // pending, partial, paid, all
  const customBody = customBodyText.value.trim();

  // Validate WhatsApp requirement
  if ((type === "whatsapp" || type === "both") && !config.businessPhone) {
    showMessage("Please add your business phone number in settings", "error");
    return;
  }

  // Build base payload
  const payload = {
    url: config.sheetLink,
    body: customBody || "",
    name: config.userName,
  };

  // Handle different combinations
  if (to === "pending" || to === "partial") {
    // Add status for pending/partial
    payload.status = to;

    if (type === "email") {
      await sendToN8N(
        payload,
        `Email sent to ${to} recipients`,
        N8N_REMINDER_WEBHOOK,
      );
    } else if (type === "whatsapp") {
      await sendToN8N(
        payload,
        `WhatsApp sent to ${to} recipients`,
        N8N_REMINDER_WP_WEBHOOK,
      );
    } else if (type === "both") {
      // Send to both webhooks
      await sendToN8N(
        payload,
        `Email sent to ${to} recipients`,
        N8N_REMINDER_WEBHOOK,
      );
      await sendToN8N(
        payload,
        `WhatsApp sent to ${to} recipients`,
        N8N_REMINDER_WP_WEBHOOK,
      );
    }
  } else if (to === "paid") {
    // Paid - always "both" (no status field)
    await sendToN8N(
      payload,
      "Paid reminders sent successfully",
      N8N_PAID_REMINDER_WEBHOOK,
    );
  } else if (to === "all") {
    // All - always "both" (no status field)
    await sendToN8N(
      payload,
      "All reminders sent successfully",
      N8N_ALL_REMINDER_WEBHOOK,
    );
  }
}

// Send data to n8n webhook
async function sendToN8N(payload, successMessage, webhookUrl) {
  showLoading(true);

  try {
    console.log("Sending to n8n:", webhookUrl);
    console.log("-------------------");
    console.log("Payload Details:");
    console.log("URL:", payload.url);
    console.log("Name:", payload.name);
    if (payload.status) console.log("Status:", payload.status);
    console.log("Body:", payload.body || "(empty)");
    console.log("Full Payload:", JSON.stringify(payload, null, 2));
    console.log("-------------------");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    showMessage(`✓ ${successMessage}`, "success");

    // Clear custom body after successful send
    customBodyText.value = "";
    customBodySection.classList.remove("active");
    customBodyToggle.classList.remove("active");
  } catch (error) {
    console.error("Error sending to n8n:", error);
    showMessage("❌ Failed to send. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

// Validate Google Sheets URL
function isValidGoogleSheetsUrl(url) {
  const pattern =
    /^https:\/\/(docs|sheets)\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
  return pattern.test(url);
}

// Show loading state
function showLoading(show) {
  if (show) {
    loadingState.classList.add("active");
    mainView.style.opacity = "0.5";
    mainView.style.pointerEvents = "none";
  } else {
    loadingState.classList.remove("active");
    mainView.style.opacity = "1";
    mainView.style.pointerEvents = "auto";
  }
}

// Show success/error message
function showMessage(message, type) {
  successMsg.textContent = message;
  successMsg.style.background = type === "error" ? "#ffebee" : "#e8f5e9";
  successMsg.style.color = type === "error" ? "#c62828" : "#2e7d32";
  successMsg.classList.add("active");

  setTimeout(() => {
    successMsg.classList.remove("active");
  }, 3000);
}
