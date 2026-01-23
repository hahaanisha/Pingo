// Configuration object to store user settings
let config = {
  userName: "",
  userEmail: "",
  businessPhone: "",
  sheetLink: "",
  n8nWebhookUrl: "", // You'll set this later when you create the n8n workflow
};

// DOM elements
const setupForm = document.getElementById("setupForm");
const mainView = document.getElementById("mainView");
const configForm = document.getElementById("configForm");
const settingsBtn = document.getElementById("settingsBtn");
const sendWhatsAppBtn = document.getElementById("sendWhatsAppBtn");
const loadingState = document.getElementById("loadingState");
const successMsg = document.getElementById("successMsg");

// Initialize the extension
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  checkSetupStatus();
  setupEventListeners();
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

// Setup all event listeners
function setupEventListeners() {
  // Configuration form submission
  configForm.addEventListener("submit", handleConfigSubmit);

  // Settings button
  settingsBtn.addEventListener("click", () => {
    mainView.classList.remove("active");
    setupForm.classList.add("active");
  });

  // Email buttons (pending, partial, paid, all)
  const emailButtons = document.querySelectorAll("[data-status]");
  emailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");
      handleEmailSend(status);
    });
  });

  // WhatsApp button
  sendWhatsAppBtn.addEventListener("click", handleWhatsAppSend);
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

  // Show success message
  showMessage("✓ Configuration saved successfully!", "success");

  // Switch to main view after a short delay
  setTimeout(() => {
    checkSetupStatus();
  }, 1000);
}

// Handle email send for different statuses
async function handleEmailSend(status) {
  // Prepare payload
  const payload = {
    action: "email",
    sheetLink: config.sheetLink,
    config: {
      userName: config.userName,
      userEmail: config.userEmail,
    },
    timestamp: new Date().toISOString(),
  };

  // Add status only if not "all"
  if (status !== "all") {
    payload.status = status;
  }

  await sendToN8N(payload, `Email sent to ${status} recipients`);
}

// Handle WhatsApp send
async function handleWhatsAppSend() {
  if (!config.businessPhone) {
    showMessage("Please add your business phone number in settings", "error");
    return;
  }

  // Prepare payload
  const payload = {
    action: "whatsapp",
    sheetLink: config.sheetLink,
    config: {
      userName: config.userName,
      userEmail: config.userEmail,
      businessPhone: config.businessPhone,
    },
    timestamp: new Date().toISOString(),
  };

  await sendToN8N(payload, "WhatsApp messages sent successfully");
}

// Send data to n8n webhook
async function sendToN8N(payload, successMessage) {
  // Show loading state
  showLoading(true);

  try {
    // TODO: Replace this with your actual n8n webhook URL
    const n8nWebhookUrl = "YOUR_N8N_WEBHOOK_URL_HERE";

    // Log the payload for testing
    console.log("Sending to n8n:", payload);
    console.log("-------------------");
    console.log("Payload Details:");
    console.log("Action:", payload.action);
    console.log("Sheet Link:", payload.sheetLink);
    if (payload.status) console.log("Status Filter:", payload.status);
    console.log("-------------------");

    /*
    // Uncomment this when you have your n8n webhook ready
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to send to n8n');
    }
    
    const result = await response.json();
    console.log('n8n response:', result);
    */

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Show success message
    showMessage(`✓ ${successMessage}`, "success");
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
