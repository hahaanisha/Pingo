// Configuration object to store user settings
let config = {
  userName: "",
  userEmail: "",
  businessPhone: "",
  sheetLink: "",
  automationStatus: false,
};

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
const N8N_AI_WRITE_WEBHOOK = "https://gadgetejas.app.n8n.cloud/webhook/AIwrite";

// Sample CSV download URL
const SAMPLE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1tDjiwxDS_0GljS8XgWKoYconjIEQ8yNj_5lqlv-mffI/export?format=xlsx";

// DOM elements - will be initialized after DOM loads
let setupForm, mainView, configForm, settingsBtn, closeBtn, downloadBtn;
let loadingState, successMsg, automationToggle;
let reminderType, reminderTo, customBodyToggleGroup, customBodyToggle;
let customBodySection, customBodyText, sendReminderBtn;
let aiBtn,
  aiPromptModal,
  aiPromptText,
  aiCancelBtn,
  aiCancelBtn2,
  aiGenerateBtn;

// Initialize the extension
document.addEventListener("DOMContentLoaded", async () => {
  initializeDOMElements();
  await loadConfig();
  checkSetupStatus();
  setupEventListeners();
  updateToggleUI();
});

// Initialize all DOM elements
function initializeDOMElements() {
  setupForm = document.getElementById("setupForm");
  mainView = document.getElementById("mainView");
  configForm = document.getElementById("configForm");
  settingsBtn = document.getElementById("settingsBtn");
  closeBtn = document.getElementById("closeBtn");
  downloadBtn = document.getElementById("downloadBtn");
  loadingState = document.getElementById("loadingState");
  successMsg = document.getElementById("successMsg");
  automationToggle = document.getElementById("automationToggle");

  reminderType = document.getElementById("reminderType");
  reminderTo = document.getElementById("reminderTo");
  customBodyToggleGroup = document.getElementById("customBodyToggleGroup");
  customBodyToggle = document.getElementById("customBodyToggle");
  customBodySection = document.getElementById("customBodySection");
  customBodyText = document.getElementById("customBodyText");
  sendReminderBtn = document.getElementById("sendReminderBtn");

  aiBtn = document.getElementById("aiBtn");
  aiPromptModal = document.getElementById("aiPromptModal");
  aiPromptText = document.getElementById("aiPromptText");
  aiCancelBtn = document.getElementById("aiCancelBtn");
  aiCancelBtn2 = document.getElementById("aiCancelBtn2");
  aiGenerateBtn = document.getElementById("aiGenerateBtn");
}

// Load configuration from Chrome storage
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["config"], (result) => {
      if (result.config) {
        config = result.config;
        // Populate form fields if config exists
        const userNameInput = document.getElementById("userName");
        const userEmailInput = document.getElementById("userEmail");
        const businessPhoneInput = document.getElementById("businessPhone");
        const sheetLinkInput = document.getElementById("sheetLink");

        if (userNameInput) userNameInput.value = config.userName || "";
        if (userEmailInput) userEmailInput.value = config.userEmail || "";
        if (businessPhoneInput)
          businessPhoneInput.value = config.businessPhone || "";
        if (sheetLinkInput) sheetLinkInput.value = config.sheetLink || "";
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
    if (setupForm) setupForm.classList.remove("active");
    if (mainView) mainView.classList.add("active");
  } else {
    if (setupForm) setupForm.classList.add("active");
    if (mainView) mainView.classList.remove("active");
  }
}

// Update toggle UI based on config
function updateToggleUI() {
  if (!automationToggle) return;

  if (config.automationStatus) {
    automationToggle.classList.add("active");
  } else {
    automationToggle.classList.remove("active");
  }
}

// Update Type dropdown based on To selection
function updateTypeDropdown() {
  if (!reminderTo || !reminderType || !customBodyToggleGroup) return;

  const selectedTo = reminderTo.value;

  if (selectedTo === "paid" || selectedTo === "all") {
    reminderType.value = "both";
    reminderType.disabled = true;
    customBodyToggleGroup.style.display = "flex";
  } else {
    reminderType.disabled = false;
    customBodyToggleGroup.style.display = "none";
    if (customBodyToggle) customBodyToggle.classList.remove("active");
    if (customBodySection) customBodySection.classList.remove("active");
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Configuration form submission
  if (configForm) {
    configForm.addEventListener("submit", handleConfigSubmit);
  }

  // Settings button
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      if (mainView) mainView.classList.remove("active");
      if (setupForm) setupForm.classList.add("active");
      updateToggleUI();
    });
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      window.close();
    });
  }

  // Download button
  if (downloadBtn) {
    downloadBtn.addEventListener("click", handleDownload);
  }

  // Automation toggle
  if (automationToggle) {
    automationToggle.addEventListener("click", () => {
      config.automationStatus = !config.automationStatus;
      updateToggleUI();
    });
  }

  // Reminder "To" dropdown
  if (reminderTo) {
    reminderTo.addEventListener("change", updateTypeDropdown);
  }

  // Custom body toggle
  if (customBodyToggle) {
    customBodyToggle.addEventListener("click", () => {
      customBodyToggle.classList.toggle("active");
      if (customBodyToggle.classList.contains("active")) {
        if (customBodySection) customBodySection.classList.add("active");
        if (customBodyText) customBodyText.focus();
      } else {
        if (customBodySection) customBodySection.classList.remove("active");
        if (customBodyText) customBodyText.value = "";
      }
    });
  }

  // Send reminder button
  if (sendReminderBtn) {
    sendReminderBtn.addEventListener("click", handleSendReminder);
  }

  // AI button
  if (aiBtn) {
    aiBtn.addEventListener("click", () => {
      if (aiPromptModal) aiPromptModal.classList.add("active");
      if (aiPromptText) aiPromptText.focus();
    });
  }

  // AI cancel buttons
  if (aiCancelBtn) {
    aiCancelBtn.addEventListener("click", closeAIModal);
  }
  if (aiCancelBtn2) {
    aiCancelBtn2.addEventListener("click", closeAIModal);
  }

  // AI generate button
  if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener("click", handleAIGenerate);
  }

  // Close modal when clicking outside
  if (aiPromptModal) {
    aiPromptModal.addEventListener("click", (e) => {
      if (e.target === aiPromptModal) {
        closeAIModal();
      }
    });
  }
}

// Close AI modal
function closeAIModal() {
  if (aiPromptModal) aiPromptModal.classList.remove("active");
  if (aiPromptText) aiPromptText.value = "";
}

// Handle download button click
function handleDownload() {
  try {
    const link = document.createElement("a");
    link.href = SAMPLE_CSV_URL;
    link.download = "sample_payment_sheet.xlsx";
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showMessage("✓ Sample CSV download started!", "success");
  } catch (error) {
    console.error("Error downloading sample CSV:", error);
    showMessage("❌ Failed to download. Please try again.", "error");
  }
}

// Handle configuration form submission
async function handleConfigSubmit(e) {
  e.preventDefault();

  const userNameInput = document.getElementById("userName");
  const userEmailInput = document.getElementById("userEmail");
  const businessPhoneInput = document.getElementById("businessPhone");
  const sheetLinkInput = document.getElementById("sheetLink");

  config.userName = userNameInput ? userNameInput.value.trim() : "";
  config.userEmail = userEmailInput ? userEmailInput.value.trim() : "";
  config.businessPhone = businessPhoneInput
    ? businessPhoneInput.value.trim()
    : "";
  config.sheetLink = sheetLinkInput ? sheetLinkInput.value.trim() : "";

  if (!isValidGoogleSheetsUrl(config.sheetLink)) {
    showMessage("Please enter a valid Google Sheets URL", "error");
    return;
  }

  await saveConfig();
  await sendWelcomeWebhook();
  showMessage("✓ Configuration saved successfully!", "success");

  setTimeout(() => {
    checkSetupStatus();
  }, 1000);
}

// Send welcome webhook
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

  const type = reminderType ? reminderType.value : "email";
  const to = reminderTo ? reminderTo.value : "pending";
  const customBody = customBodyText ? customBodyText.value.trim() : "";

  if ((type === "whatsapp" || type === "both") && !config.businessPhone) {
    showMessage("Please add your business phone number in settings", "error");
    return;
  }

  const payload = {
    url: config.sheetLink,
    body: customBody || "",
    name: config.userName,
  };

  if (to === "pending" || to === "partial") {
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
    await sendToN8N(
      payload,
      "Paid reminders sent successfully",
      N8N_PAID_REMINDER_WEBHOOK,
    );
  } else if (to === "all") {
    await sendToN8N(
      payload,
      "All reminders sent successfully",
      N8N_ALL_REMINDER_WEBHOOK,
    );
  }
}

// Handle AI generate button click
async function handleAIGenerate() {
  if (!aiPromptText) {
    console.error("AI prompt text element not found");
    return;
  }

  const prompt = aiPromptText.value.trim();

  if (!prompt) {
    showMessage("Please enter a prompt for AI", "error");
    return;
  }

  // Close modal immediately
  closeAIModal();

  // Show loading state
  showLoading(true);

  try {
    const payload = {
      prompt: prompt,
    };

    console.log("=== AI Generation Request ===");
    console.log("Sending to AI webhook:", N8N_AI_WRITE_WEBHOOK);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(N8N_AI_WRITE_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("=== AI Response Received ===");
    console.log("Full response:", JSON.stringify(result, null, 2));

    // Extract text from the response
    // Expected format: [{ "output": { "response": "text here" } }]
    let generatedText = "";

    try {
      if (Array.isArray(result) && result.length > 0) {
        // Response is an array
        console.log("Response is an array");
        const firstItem = result[0];

        if (firstItem.output && firstItem.output.response) {
          generatedText = firstItem.output.response;
          console.log("Extracted from result[0].output.response");
        } else if (firstItem.output) {
          generatedText =
            typeof firstItem.output === "string"
              ? firstItem.output
              : JSON.stringify(firstItem.output);
          console.log("Extracted from result[0].output");
        } else if (firstItem.response) {
          generatedText = firstItem.response;
          console.log("Extracted from result[0].response");
        } else if (firstItem.text) {
          generatedText = firstItem.text;
          console.log("Extracted from result[0].text");
        } else {
          generatedText = JSON.stringify(firstItem, null, 2);
          console.log("Using entire first item");
        }
      } else if (result.output && result.output.response) {
        // Response is an object with nested structure
        generatedText = result.output.response;
        console.log("Extracted from result.output.response");
      } else if (result.output) {
        generatedText =
          typeof result.output === "string"
            ? result.output
            : JSON.stringify(result.output);
        console.log("Extracted from result.output");
      } else if (result.response) {
        generatedText = result.response;
        console.log("Extracted from result.response");
      } else if (result.text) {
        generatedText = result.text;
        console.log("Extracted from result.text");
      } else if (result.message) {
        generatedText = result.message;
        console.log("Extracted from result.message");
      } else if (result.content) {
        generatedText = result.content;
        console.log("Extracted from result.content");
      } else if (typeof result === "string") {
        generatedText = result;
        console.log("Response is a string");
      } else {
        generatedText = JSON.stringify(result, null, 2);
        console.log("Using entire response");
      }
    } catch (extractError) {
      console.error("Error extracting text:", extractError);
      generatedText = JSON.stringify(result, null, 2);
    }

    console.log("Extracted text:", generatedText);
    console.log("Text type:", typeof generatedText);

    // Ensure it's a string
    if (generatedText === null || generatedText === undefined) {
      generatedText = "No content generated";
    } else if (typeof generatedText !== "string") {
      generatedText = String(generatedText);
    }

    // Clean up the text
    if (generatedText && typeof generatedText === "string") {
      generatedText = generatedText.trim();
      // Replace multiple newlines with double newlines
      generatedText = generatedText.replace(/\n{3,}/g, "\n\n");
    }

    console.log("Final text to insert:", generatedText);

    // Ensure custom body section is visible
    if (customBodySection && !customBodySection.classList.contains("active")) {
      if (customBodyToggle) customBodyToggle.classList.add("active");
      customBodySection.classList.add("active");
    }

    // Insert into textarea
    if (customBodyText) {
      customBodyText.value = generatedText;
      customBodyText.focus();
      console.log("Text inserted successfully");
    }

    showMessage("✓ AI content generated successfully!", "success");
  } catch (error) {
    console.error("=== AI Generation Error ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    showMessage(
      "❌ Failed to generate AI content. Please check console.",
      "error",
    );
  } finally {
    showLoading(false);
  }
}

// Send data to n8n webhook
async function sendToN8N(payload, successMessage, webhookUrl) {
  showLoading(true);

  try {
    console.log("Sending to n8n:", webhookUrl);
    console.log("Payload:", JSON.stringify(payload, null, 2));

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
    if (customBodyText) customBodyText.value = "";
    if (customBodySection) customBodySection.classList.remove("active");
    if (customBodyToggle) customBodyToggle.classList.remove("active");
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
  if (!loadingState || !mainView) return;

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
  if (!successMsg) return;

  successMsg.textContent = message;
  successMsg.style.background = type === "error" ? "#ffebee" : "#e8f5e9";
  successMsg.style.color = type === "error" ? "#c62828" : "#2e7d32";
  successMsg.classList.add("active");

  setTimeout(() => {
    successMsg.classList.remove("active");
  }, 3000);
}
