// Configuration object to store user settings
let config = {
  userName: "",
  userEmail: "",
  businessPhone: "",
  sheetLink: "",
  automationStatus: false,
};

// Track which button's custom body is being edited
let activeCustomBodyFor = null;

// DOM elements
const setupForm = document.getElementById("setupForm");
const mainView = document.getElementById("mainView");
const configForm = document.getElementById("configForm");
const settingsBtn = document.getElementById("settingsBtn");
const sendWhatsAppBtn = document.getElementById("sendWhatsAppBtn");
const loadingState = document.getElementById("loadingState");
const successMsg = document.getElementById("successMsg");
const customBodySection = document.getElementById("customBodySection");
const customBodyText = document.getElementById("customBodyText");
const automationToggle = document.getElementById("automationToggle");

// n8n webhook URLs
const N8N_WELCOME_WEBHOOK = "https://gadgetejas.app.n8n.cloud/webhook/welcome";
const N8N_REMINDER_WEBHOOK =
  "https://gadgetejas.app.n8n.cloud/webhook/reminders";
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

// Setup all event listeners
function setupEventListeners() {
  // Configuration form submission
  configForm.addEventListener("submit", handleConfigSubmit);

  // Settings button
  settingsBtn.addEventListener("click", () => {
    mainView.classList.remove("active");
    setupForm.classList.add("active");
    customBodySection.classList.remove("active");
    updateToggleUI();
  });

  // Automation toggle
  automationToggle.addEventListener("click", () => {
    config.automationStatus = !config.automationStatus;
    updateToggleUI();
  });

  // Email buttons (pending, partial, paid, all)
  const emailButtons = document.querySelectorAll("[data-status]");
  emailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");
      handleEmailSend(status);
    });
  });

  // Mini gear buttons
  const miniGears = document.querySelectorAll(".mini-gear");
  miniGears.forEach((gear) => {
    gear.addEventListener("click", () => {
      const forButton = gear.getAttribute("data-for");
      toggleCustomBody(forButton, gear);
    });
  });

  // WhatsApp button
  sendWhatsAppBtn.addEventListener("click", handleWhatsAppSend);
}

// Toggle custom body editor
function toggleCustomBody(forButton, gearElement) {
  // If clicking the same button, toggle off
  if (
    activeCustomBodyFor === forButton &&
    customBodySection.classList.contains("active")
  ) {
    customBodySection.classList.remove("active");
    gearElement.classList.remove("active");
    activeCustomBodyFor = null;
    customBodyText.value = "";

    // Remove active class from all gears
    document
      .querySelectorAll(".mini-gear")
      .forEach((g) => g.classList.remove("active"));
  } else {
    // Show custom body section
    customBodySection.classList.add("active");
    activeCustomBodyFor = forButton;

    // Update active state on gears
    document
      .querySelectorAll(".mini-gear")
      .forEach((g) => g.classList.remove("active"));
    gearElement.classList.add("active");

    // Focus on textarea
    customBodyText.focus();
  }
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
      automationStatus: config.automationStatus.toString(), // Convert boolean to string
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
    // Don't show error to user for welcome webhook - it's not critical
  }
}

// Handle email send for different statuses
async function handleEmailSend(status) {
  if (!config.sheetLink) {
    showMessage("Please configure your Google Sheet first", "error");
    return;
  }

  const customBody = customBodyText.value.trim();

  const payload = {
    url: config.sheetLink,
  };

  // Add custom body (required for all webhooks, empty string if not provided)
  payload.body = customBody || "";

  // Route to different webhooks based on status
  let webhookUrl = N8N_REMINDER_WEBHOOK;
  let successMessage = `Emails sent to ${status} recipients`;

  if (status === "all") {
    webhookUrl = N8N_ALL_REMINDER_WEBHOOK;
    successMessage = "All reminders sent successfully";
  } else if (status === "paid") {
    webhookUrl = N8N_PAID_REMINDER_WEBHOOK;
    successMessage = "Paid reminders sent successfully";
  } else {
    // For pending and partial, include status
    payload.status = status;
  }

  await sendToN8N(payload, successMessage, webhookUrl);
}

// Handle WhatsApp send
async function handleWhatsAppSend() {
  if (!config.businessPhone) {
    showMessage("Please add your business phone number in settings", "error");
    return;
  }

  if (!config.sheetLink) {
    showMessage("Please configure your Google Sheet first", "error");
    return;
  }

  const payload = {
    url: config.sheetLink,
    status: "all",
  };

  await sendToN8N(payload, "WhatsApp messages sent successfully");
}

// Send data to n8n reminder webhook
async function sendToN8N(
  payload,
  successMessage,
  webhookUrl = N8N_REMINDER_WEBHOOK,
) {
  showLoading(true);

  try {
    console.log("Sending to n8n:", webhookUrl);
    console.log("-------------------");
    console.log("Payload Details:");
    console.log("URL:", payload.url);
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
    document
      .querySelectorAll(".mini-gear")
      .forEach((g) => g.classList.remove("active"));
    activeCustomBodyFor = null;
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
