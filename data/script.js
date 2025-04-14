// Global variable to hold the entire configuration fetched from the ESP32
let currentConfig = {};

// Function to fetch configuration from ESP32
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentConfig = await response.json(); // Store the fetched config globally
        populateDeviceSettingsForm(currentConfig.deviceSettings);
        // Later, add calls here to populate other sections (IOs, Rules, etc.)

    } catch (error) {
        console.error("Error fetching configuration:", error);
        alert("Error loading configuration from device.");
    }
}

// Function to populate the Device Settings form fields
function populateDeviceSettingsForm(settings) {
    if (!settings) return; // Handle case where deviceSettings might be missing

    document.getElementById('deviceName').value = settings.DeviceName || '';
    document.getElementById('wifiSSID').value = settings.SSID || '';
    document.getElementById('wifiPassword').value = settings.PASS || ''; // Populate password
    document.getElementById('runProgram').checked = settings.run || false;
}

// Function to save configuration to ESP32
async function saveConfig() {
    // Update the deviceSettings part of the global config object
    if (!currentConfig.deviceSettings) {
        currentConfig.deviceSettings = {}; // Initialize if it doesn't exist
    }
    currentConfig.deviceSettings.DeviceName = document.getElementById('deviceName').value;
    currentConfig.deviceSettings.SSID = document.getElementById('wifiSSID').value;
    currentConfig.deviceSettings.PASS = document.getElementById('wifiPassword').value;
    currentConfig.deviceSettings.run = document.getElementById('runProgram').checked;

    // Add logic here later to update other parts of currentConfig (IOs, Rules, etc.)
    // For now, we just send back the fetched config with updated deviceSettings

    console.log("Sending configuration:", JSON.stringify(currentConfig, null, 2)); // Log the JSON being sent

    try {
        const response = await fetch('/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentConfig), // Send the entire config object
        });

        if (response.ok) {
            alert("Configuration saved successfully! The device will now restart.");
            // Optionally disable the button or show a loading indicator
            document.getElementById('saveConfigBtn').disabled = true;
            // The ESP32 will handle the restart after sending the OK response.
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error saving configuration:", error);
        alert(`Error saving configuration: ${error.message}`);
        document.getElementById('saveConfigBtn').disabled = false; // Re-enable button on error
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadConfig(); // Load config when the page is ready

    const saveButton = document.getElementById('saveConfigBtn');
    if (saveButton) {
        saveButton.addEventListener('click', saveConfig);
    }
});
