// Global variable to hold the entire configuration fetched from the ESP32
let currentConfig = {};

let ioVariableSortable = null; // To hold the Sortable instance

// --- Enum Maps (for display/lookup) ---
// Should match enums in dataStructure.h
const dataTypesMap = {
    0: 'DigitalInput', 1: 'DigitalOutput', 2: 'AnalogInput', 3: 'SoftIO', 4: 'Timer'
};
const operationModeMap = {
    0: 'None',          // Default/Raw/Volatile
    1: 'Rising Edge',   // DI
    2: 'Falling Edge',  // DI
    3: 'State Change',  // DI
    4: 'Pulse',         // DO
    5: 'One Shot',      // Timer
    6: 'Repeating',     // Timer
    8: 'Scaled (0-100%)', // AI
    9: 'Persistent'     // SoftIO
};
const operationModeShortMap = {
    0: 'None', // Default/Raw/Volatile
    1: 'Rise', // DI
    2: 'Fall', // DI
    3: 'StCh', // DI 
    4: 'Puls', // DO  
    5: 'Once', // Timer
    6: 'Rept', // Timer
    8: 'Scle', // AI
    9: 'Pers'  // SoftIO
};



// --- NEW: Helper functions for Condition Badges ---

function getConditionBadge1(comparisonType) {
    // Badge 1: Attribute Field (State, Value, Flag)
    switch (comparisonType) {
        case 0: // isTrue
        case 1: // isFalse
            return { text: 'State', class: 'bg-primary', title: 'Checks IO Variable State' };
        case 2: // isEqual
        case 3: // isLess
        case 4: // isGreater
            return { text: 'Value', class: 'bg-info text-dark', title: 'Checks IO Variable Value' };
        case 5: // flagIsTrue
        case 6: // flagIsFalse
            return { text: 'Flag', class: 'bg-warning text-dark', title: 'Checks IO Variable Flag' };
        default:
            return { text: 'Attr?', class: 'bg-secondary', title: 'Unknown Attribute' };
    }
}

function getConditionBadge2(comparisonType) {
    // Badge 2: Comparison Operator (=, <, >)
    switch (comparisonType) {
        case 0: // isTrue
        case 1: // isFalse
        case 2: // isEqual
        case 5: // flagIsTrue
        case 6: // flagIsFalse
            return { text: '=', class: 'bg-success', title: 'Equals' };
        case 3: // isLess
            return { text: '<', class: 'bg-success', title: 'Less Than' };
        case 4: // isGreater
            return { text: '>', class: 'bg-success', title: 'Greater Than' };
        default:
            return { text: 'Op?', class: 'bg-secondary', title: 'Unknown Operator' };
    }
}

function getConditionBadge3(comparisonType, value) {
    // Badge 3: Target (High, Low, Constant Value)
    switch (comparisonType) {
        case 0: // isTrue
        case 5: // flagIsTrue
            return { text: 'High', class: 'bg-success', title: 'Target: True / High' };
        case 1: // isFalse
        case 6: // flagIsFalse
            return { text: 'Low', class: 'bg-danger', title: 'Target: False / Low' };
        case 2: // isEqual
        case 3: // isLess
        case 4: // isGreater
            // Use the actual value for comparisons involving value
            return { text: value, class: 'bg-purple', title: `Target Value: ${value}` }; // Using purple like IO target
        default:
            return { text: 'Tgt?', class: 'bg-secondary', title: 'Unknown Target' };
    }
}
// --- End NEW Helper Functions ---


// Function to fetch configuration from ESP32
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentConfig = await response.json(); // Store the fetched config globally
        populateDeviceSettingsForm(currentConfig.deviceSettings);
        populateIoVariables(currentConfig.ioVariables);
        initializeDragAndDrop();
        displayConditions();
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

// Function to populate the IO Variables lists (starting with Digital Inputs)
function populateIoVariables(ioVariables) {
    const diList = document.getElementById('digital-inputs-list');
    const doList = document.getElementById('digital-outputs-list');
    const aiList = document.getElementById('analog-inputs-list');
    const softioList = document.getElementById('softio-list');
    const timersList = document.getElementById('timers-list');
    // Add other list elements later (doList, aiList, etc.)

    if (!diList || !doList || !aiList) {
        console.error("Required IO list element(s) not found!");
        return; // Exit if the list element doesn't exist
    }

    // Clear existing items before adding new ones
    diList.innerHTML = '';
    doList.innerHTML = '';
    aiList.innerHTML = '';
    softioList.innerHTML = '';
    timersList.innerHTML = '';
    // Clear other lists later (e.g., doList.innerHTML = '';)

    if (!ioVariables || !Array.isArray(ioVariables)) {
        console.warn("IOVariables data is missing or not an array. Cannot populate list.");
        return; // Exit if data is invalid
    }

    // Loop through each IO variable received from the backend
    ioVariables.forEach(io => {
        // Filter specifically for Digital Inputs (type 0)
        if (io.t === 0) { // 0 corresponds to DigitalInput enum in dataTypesMap
            const listItem = document.createElement('li');

            // Add base classes and the 'inactive' class if status (s) is false
            listItem.className = `list-group-item py-2 px-2 d-flex justify-content-between align-items-center io-variable-item ${!io.s ? 'inactive' : ''}`;

            // Store type and number in data attributes for later use (e.g., editing, dragging)
            listItem.dataset.type = dataTypesMap[io.t]; // Stores "DigitalInput"
            listItem.dataset.num = io.n; // Stores the input number (1, 2, etc.)

            // --- Construct the inner HTML for the list item ---

            // Get the short mode text (e.g., 'N', 'R') and full mode text for the tooltip
            const modeShort = operationModeShortMap[io.m] || '?'; // Use '?' if mode is unknown
            const modeTitle = operationModeMap[io.m] || 'Unknown Mode';

            // Determine state display (text and background color)
            const stateText = io.st ? 'On' : 'Off'; // Use the runtime state 'st'
            const stateBg = io.st ? 'bg-success' : 'bg-danger'; // Green for true/HIGH, Red for false/LOW
            const stateTitle = io.st ? 'True/HIGH' : 'False/LOW';

            // Determine value display (using bg-info for distinction)
            const valueText = io.v; // Use the raw value 'v'
            const valueBg = 'bg-info text-dark'; // Blue background
            const valueTitle = `Value: ${io.v}`;

            // Determine flag display (text and background color)
            const flagText = io.f ? 'Fl' : 'Cl'; // Use the flag 'f'
            const flagBg = io.f ? 'bg-warning text-dark' : 'bg-light text-dark'; // Yellow for true, Light grey for false
            const flagTitle = io.f ? 'True' : 'False';

            // Set the innerHTML using a template literal for readability
            listItem.innerHTML = `
                <!-- 1. Input Number (Left) -->
                <span class="io-number fs-5 fw-bold me-2">I${io.n}</span>

                <!-- 2. Name & Indicators Group (Takes remaining space, Middle) -->
                <div class="flex-grow-1 me-2">
                    <!-- 2a. User Assigned Name (Small Style, Upper Row) -->
                    <div class="io-name small ">${io.nm || `Input ${io.n}`}</div>
                    <!-- 2b. Indicator Badges (Small Style, Lower Row) -->
                    <div class="io-indicators">
                        <span class="badge ${stateBg}" title="State: ${stateTitle}">${stateText}</span>
                        <span class="badge ${valueBg}" title="${valueTitle}">${valueText}</span>
                        <span class="badge ${flagBg}" title="Flag: ${flagTitle}">${flagText}</span>
                        <span class="badge bg-secondary" title="Mode: ${modeTitle}">${modeShort}</span>
                    </div>
                </div>

                <!-- 3. Gear Icon -->
                <button class="btn btn-sm btn-outline-secondary edit-io-btn fs-6 p-1" title="Edit"
                        data-bs-toggle="modal" data-bs-target="#editIoVariableModal"
                        data-type="${dataTypesMap[io.t]}" data-num="${io.n}">
                    ⚙️
                </button>

            `;

            // Add the fully constructed list item to the list in the HTML
            diList.appendChild(listItem);
        }
        else if (io.t === 1) { // 1 corresponds to DigitalOutput
            const listItem = document.createElement('li');
            listItem.className = `list-group-item py-2 px-2 d-flex justify-content-between align-items-center io-variable-item ${!io.s ? 'inactive' : ''}`;
            listItem.dataset.type = dataTypesMap[io.t]; // Stores "DigitalOutput"
            listItem.dataset.num = io.n;

            const modeShort = operationModeShortMap[io.m] || '?';
            const modeTitle = operationModeMap[io.m] || 'Unknown Mode';
            const stateText = io.st ? 'On' : 'Off';
            const stateBg = io.st ? 'bg-success' : 'bg-danger';
            const stateTitle = io.st ? 'True/HIGH' : 'False/LOW';
            const valueText = io.v; // DOs might just use 0/1 for value, but display it anyway
            const valueBg = 'bg-info text-dark';
            const valueTitle = `Value: ${io.v}`;
            const flagText = io.f ? 'Fl' : 'Cl'; // Assuming DOs might have flags too
            const flagBg = io.f ? 'bg-warning text-dark' : 'bg-light text-dark';
            const flagTitle = io.f ? 'True' : 'False';

            listItem.innerHTML = `
                <span class="io-number fs-5 fw-bold me-2">O${io.n}</span>
                <div class="flex-grow-1 me-2">
                    <div class="io-name small ">${io.nm || `Output ${io.n}`}</div>
                    <div class="io-indicators">
                        <span class="badge ${stateBg}" title="State: ${stateTitle}">${stateText}</span>
                        <span class="badge ${valueBg}" title="${valueTitle}">${valueText}</span>
                        <span class="badge ${flagBg}" title="Flag: ${flagTitle}">${flagText}</span>
                        <span class="badge bg-secondary" title="Mode: ${modeTitle}">${modeShort}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-io-btn fs-6 p-1" title="Edit"
                        data-bs-toggle="modal" data-bs-target="#editDoVariableModal" 
                        data-type="${dataTypesMap[io.t]}" data-num="${io.n}">
                    ⚙️
                </button>
            `;
            doList.appendChild(listItem); // <-- Append to doList
        }
        else if (io.t === 2) { // 2 corresponds to AnalogInput
            const listItem = document.createElement('li');
            // Apply same classes, including 'inactive' based on status 's'
            listItem.className = `list-group-item py-2 px-2 d-flex justify-content-between align-items-center io-variable-item ${!io.s ? 'inactive' : ''}`;
            listItem.dataset.type = dataTypesMap[io.t]; // Stores "AnalogInput"
            listItem.dataset.num = io.n;

            // --- Calculate display values (similar to DI/DO) ---
            const modeShort = operationModeShortMap[io.m] || '?'; // Relevant modes: 0 (None), 8 (Scaled)
            const modeTitle = operationModeMap[io.m] || 'Unknown Mode';
            // Analog inputs don't have a typical boolean state, but we display 'st' for consistency
            const stateText = io.st ? 'On' : 'Off';
            const stateBg = io.st ? 'bg-success' : 'bg-danger';
            const stateTitle = io.st ? 'True' : 'False'; // Less meaningful for AI, but consistent
            // Value is the key indicator for AI
            const valueText = io.v;
            const valueBg = 'bg-info text-dark'; // Use info bg for value
            const valueTitle = `Raw Value: ${io.v}`; // Title shows raw value
            // Flags can still be useful
            const flagText = io.f ? 'Fl' : 'Cl';
            const flagBg = io.f ? 'bg-warning text-dark' : 'bg-light text-dark';
            const flagTitle = io.f ? 'True' : 'False';

            // --- Construct inner HTML (matches DI/DO structure) ---
            listItem.innerHTML = `
                <span class="io-number fs-5 fw-bold me-2">A${io.n}</span>
                <div class="flex-grow-1 me-2">
                    <div class="io-name small ">${io.nm || `Analog In ${io.n}`}</div>
                    <div class="io-indicators">
                        <span class="badge ${stateBg}" title="State: ${stateTitle}">${stateText}</span>
                        <span class="badge ${valueBg}" title="${valueTitle}">${valueText}</span>
                        <span class="badge ${flagBg}" title="Flag: ${flagTitle}">${flagText}</span>
                        <span class="badge bg-secondary" title="Mode: ${modeTitle}">${modeShort}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-io-btn fs-6 p-1" title="Edit"
                        data-bs-toggle="modal" data-bs-target="#editAiVariableModal"
                        data-type="${dataTypesMap[io.t]}" data-num="${io.n}">
                    ⚙️
                </button>
            `;

            // Append to the Analog Inputs list
            aiList.appendChild(listItem); // <-- Append to aiList
        }
        else if (io.t === 3) { // 3 corresponds to SoftIO
            const listItem = document.createElement('li');
            listItem.className = `list-group-item py-2 px-2 d-flex justify-content-between align-items-center io-variable-item ${!io.s ? 'inactive' : ''}`;
            listItem.dataset.type = dataTypesMap[io.t]; // Stores "SoftIO"
            listItem.dataset.num = io.n;

            const modeShort = operationModeShortMap[io.m] || '?'; // None/Pers
            const modeTitle = operationModeMap[io.m] || 'Unknown Mode';
            const stateText = io.st ? 'On' : 'Off'; // SoftIO has a boolean state
            const stateBg = io.st ? 'bg-success' : 'bg-danger';
            const stateTitle = io.st ? 'True' : 'False';
            const valueText = io.v; // SoftIO has a numerical value
            const valueBg = 'bg-info text-dark';
            const valueTitle = `Value: ${io.v}`;
            const flagText = io.f ? 'Fl' : 'Cl'; // SoftIO can have a flag
            const flagBg = io.f ? 'bg-warning text-dark' : 'bg-light text-dark';
            const flagTitle = io.f ? 'True' : 'False';

            listItem.innerHTML = `
                <span class="io-number fs-5 fw-bold me-2">S${io.n}</span>
                <div class="flex-grow-1 me-2">
                    <div class="io-name small ">${io.nm || `Soft IO ${io.n}`}</div>
                    <div class="io-indicators">
                        <span class="badge ${stateBg}" title="State: ${stateTitle}">${stateText}</span>
                        <span class="badge ${valueBg}" title="${valueTitle}">${valueText}</span>
                        <span class="badge ${flagBg}" title="Flag: ${flagTitle}">${flagText}</span>
                        <span class="badge bg-secondary" title="Mode: ${modeTitle}">${modeShort}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-io-btn fs-6 p-1" title="Edit"
                        data-bs-toggle="modal" data-bs-target="#editSoftIoVariableModal"
                        data-type="${dataTypesMap[io.t]}" data-num="${io.n}">
                    ⚙️
                </button>
            `;
            softioList.appendChild(listItem); // <-- Append to softioList
        }
        else if (io.t === 4) { // 4 corresponds to Timer
            const listItem = document.createElement('li');
            listItem.className = `list-group-item py-2 px-2 d-flex justify-content-between align-items-center io-variable-item ${!io.s ? 'inactive' : ''}`;
            listItem.dataset.type = dataTypesMap[io.t]; // Stores "Timer"
            listItem.dataset.num = io.n;

            const modeShort = operationModeShortMap[io.m] || '?'; // Once/Rept
            const modeTitle = operationModeMap[io.m] || 'Unknown Mode';
            const stateText = io.st ? 'Run' : 'Stop'; // Timer state: Running or Stopped
            const stateBg = io.st ? 'bg-success' : 'bg-secondary'; // Green for running, grey for stopped
            const stateTitle = io.st ? 'Running' : 'Stopped';
            const valueText = io.v; // Timer value (current count?)
            const valueBg = 'bg-info text-dark';
            const valueTitle = `Current Value: ${io.v}`; // Indicate it's the current count
            const flagText = io.f ? 'Exp' : 'Rst'; // Timer flag: Expired or Reset/Not Expired
            const flagBg = io.f ? 'bg-warning text-dark' : 'bg-light text-dark'; // Yellow for expired
            const flagTitle = io.f ? 'Expired' : 'Reset/Not Expired';

            listItem.innerHTML = `
                <span class="io-number fs-5 fw-bold me-2">T${io.n}</span>
                <div class="flex-grow-1 me-2">
                    <div class="io-name small ">${io.nm || `Timer ${io.n}`}</div>
                    <div class="io-indicators">
                        <span class="badge ${stateBg}" title="State: ${stateTitle}">${stateText}</span>
                        <span class="badge ${valueBg}" title="${valueTitle}">${valueText}</span>
                        <span class="badge ${flagBg}" title="Flag: ${flagTitle}">${flagText}</span>
                        <span class="badge bg-secondary" title="Mode: ${modeTitle}">${modeShort}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-io-btn fs-6 p-1" title="Edit"
                        data-bs-toggle="modal" data-bs-target="#editTimerVariableModal"
                        data-type="${dataTypesMap[io.t]}" data-num="${io.n}">
                    ⚙️
                </button>
            `;
            timersList.appendChild(listItem); // <-- Append to timersList
        }
    });

    // After populating, attach event listeners to the new edit buttons
    // We will define this function next
    attachEditButtonListeners();
}

// Function to attach listeners to edit buttons (call after populating)
function attachEditButtonListeners() {
    document.querySelectorAll('.edit-io-btn').forEach(button => {
        // Remove existing listener to prevent duplicates if re-populating
        // (Good practice, though maybe not strictly needed if innerHTML clears everything)
        button.removeEventListener('click', handleEditButtonClick);
        // Add the listener
        button.addEventListener('click', handleEditButtonClick);
    });
}


// Handler for when an edit button is clicked
function handleEditButtonClick(event) {
    const button = event.currentTarget;
    const typeStr = button.dataset.type; // "DigitalInput" or "DigitalOutput"
    const num = parseInt(button.dataset.num, 10);

    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // --- Determine which modal to populate ---
        if (typeStr === 'DigitalInput') {
            populateDiEditModal(ioVariable); // Use a dedicated function
        } else if (typeStr === 'DigitalOutput') {
            populateDoEditModal(ioVariable); // Use a dedicated function
        } else if (typeStr === 'AnalogInput') {
            populateAiEditModal(ioVariable); // Call the new function for AI
        } else if (typeStr === 'SoftIO') {
            populateSoftIoEditModal(ioVariable); // Call SoftIO function
        } else if (typeStr === 'Timer') {
            populateTimerEditModal(ioVariable); // Call Timer function
        } else {
            console.warn(`Edit button clicked for unhandled IO type: ${typeStr}`);
            alert(`Editing for ${typeStr} is not yet implemented.`);
        }
        // Note: The modal is shown automatically by data-bs-toggle attribute on the button
    } else {
        console.error(`Could not find IOVariable data for: ${typeStr} #${num}`);
        alert("Error: Could not load data for editing.");
    }
}

// Function to handle saving changes from the IO Variable modal
function saveIoVariableChanges() {
    const modal = document.getElementById('editIoVariableModal');

    // Read the identifiers from the hidden fields
    const typeStr = modal.querySelector('#editIoType').value;
    const num = parseInt(modal.querySelector('#editIoNum').value, 10);

    // Read the new values from the form fields
    const newName = modal.querySelector('#editIoName').value;
    const newMode = parseInt(modal.querySelector('#editIoMode').value, 10);
    const newStatus = modal.querySelector('#editIoStatus').checked;

    // Find the IOVariable object in our global config again
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // --- Update the object DIRECTLY in the global currentConfig ---
        ioVariable.nm = newName;
        ioVariable.m = newMode;
        ioVariable.s = newStatus;

        console.log(`Updated ${typeStr} #${num} in currentConfig:`, ioVariable);

        // Close the modal programmatically
        // Need to get the Bootstrap Modal instance associated with the element
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            console.warn("Could not get modal instance to hide it.");
            // Fallback if instance isn't found (less ideal)
            modal.classList.remove('show');
            modal.style.display = 'none';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = ''; // Restore scrolling
        }


        // --- Refresh the list in the UI to show the changes ---
        // We simply re-run the population function with the updated currentConfig
        populateIoVariables(currentConfig.ioVariables);

    } else {
        console.error(`Could not find IOVariable to save: ${typeStr} #${num}`);
        alert("Error: Could not save changes. IO Variable not found.");
    }
}


// Function to save configuration to ESP32
async function saveConfig() {
    // --- Get button reference ---
    const saveButton = document.getElementById('saveConfigBtn');
    if (!saveButton) {
        console.error("Save button not found!");
        return; // Exit if button doesn't exist
    }

    // --- Disable button and change appearance immediately ---
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...'; // Initial feedback
    saveButton.classList.remove('btn-success', 'btn-danger', 'btn-info'); // Clear previous states
    saveButton.classList.add('btn-warning');    // Add "in progress" color

    // --- Update the deviceSettings part of the global config object ---
    if (!currentConfig.deviceSettings) {
        currentConfig.deviceSettings = {};
    }
    currentConfig.deviceSettings.DeviceName = document.getElementById('deviceName').value;
    currentConfig.deviceSettings.SSID = document.getElementById('wifiSSID').value;
    currentConfig.deviceSettings.PASS = document.getElementById('wifiPassword').value;
    currentConfig.deviceSettings.run = document.getElementById('runProgram').checked;

    // --- Add logic here later to update other parts of currentConfig ---

    console.log("Sending configuration:", JSON.stringify(currentConfig, null, 2));

    // --- Timeout to infer success if no error received ---
    let successTimer = setTimeout(() => {
        // If this timer runs, assume save was successful and ESP is rebooting
        console.log("No error received within timeout, assuming success.");
        saveButton.textContent = 'Config Saved, Rebooting...';
        saveButton.classList.remove('btn-warning');
        saveButton.classList.add('btn-info'); // Use blue/info for success/rebooting state

        // Schedule page refresh after a delay (e.g., 9 seconds)
        setTimeout(() => {
            location.reload(); // Reload the page
        }, 9000); // 9000 milliseconds = 9 seconds

    }, 3000); // 3000 milliseconds = 3 second timeout

    // --- Try sending the configuration ---
    try {
        const response = await fetch('/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentConfig),
        });

        // If fetch completes, clear the success inference timer
        clearTimeout(successTimer);

        if (response.ok) {
            // SUCCESS: We actually got a 200 OK (less likely, but handle it)
            console.log("Received explicit OK response.");
            saveButton.textContent = 'Config Saved, Rebooting...';
            saveButton.classList.remove('btn-warning');
            saveButton.classList.add('btn-info'); // Blue/info color

            // Schedule page refresh
            setTimeout(() => {
                location.reload();
            }, 9000);

        } else {
            // ERROR: Server responded with an error status (4xx, 5xx)
            const errorText = await response.text();
            console.error(`Server error: ${response.status} - ${errorText}`);
            saveButton.textContent = `Error: ${errorText.substring(0, 50)}${errorText.length > 50 ? '...' : ''}`; // Show error in button
            saveButton.classList.remove('btn-warning');
            saveButton.classList.add('btn-danger'); // Red/danger color
            saveButton.disabled = false; // Re-enable button on server error
        }
    } catch (error) {
        // NETWORK ERROR: Fetch failed (network down, ESP unreachable, CORS etc.)
        clearTimeout(successTimer); // Clear timer on network error too
        console.error("Network error saving configuration:", error);
        saveButton.textContent = `Network Error: ${error.message.substring(0, 40)}${error.message.length > 40 ? '...' : ''}`;
        saveButton.classList.remove('btn-warning');
        saveButton.classList.add('btn-danger'); // Red/danger color
        saveButton.disabled = false; // Re-enable button on network error
    }
}

// Function to initialize drag-and-drop functionality
function initializeDragAndDrop() {
    const diList = document.getElementById('digital-inputs-list');
    const doList = document.getElementById('digital-outputs-list');
    const aiList = document.getElementById('analog-inputs-list');
    const softioList = document.getElementById('softio-list');
    const timersList = document.getElementById('timers-list');
    const conditionsDropZone = document.getElementById('conditions-drop-zone');
    // Get other lists/zones later as needed

    if (!diList || !doList || !aiList || !softioList || !timersList || !conditionsDropZone) { // <-- UPDATE CHECK
        console.error("Could not find necessary elements for drag and drop initialization.");
        return;
    }

    new Sortable(diList, {
        group: {
            name: 'io-logic',
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });
    new Sortable(doList, {
        group: {
            name: 'io-logic', // Same group name allows dragging DOs too
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });

    new Sortable(aiList, {
        group: {
            name: 'io-logic', // Same group name allows dragging AIs too
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });
    new Sortable(softioList, {
        group: {
            name: 'io-logic', // Same group name
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });
    new Sortable(timersList, {
        group: {
            name: 'io-logic', // Same group name
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });
    // --- END ADDED BLOCK ---

    // --- Initialize Sortable for the Conditions Drop Zone (Target) ---
    new Sortable(conditionsDropZone, {
        group: {
            name: 'io-logic', // Allows dropping from DI or DO list
            pull: false,
            put: true
        },
        animation: 150,
        sort: false,
        onAdd: function (evt) {
            // This existing onAdd function should work fine as it reads
            // data attributes (type, num) which are set correctly for both DI and DO.
            const itemEl = evt.item;
            const originalList = evt.from;
            const ioType = itemEl.dataset.type;
            const ioNum = itemEl.dataset.num;

            console.log(`Dropped IO Variable: Type=${ioType}, Num=${ioNum} onto Conditions zone.`);
            itemEl.remove(); // Remove the clone

            const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === ioType && io.n === parseInt(ioNum, 10));

            if (ioVariable) {
                // The existing populateConditionModal should also work fine,
                // as it just displays the type/num/name it receives.
                populateConditionModal(ioVariable);
            } else {
                console.error(`Could not find IOVariable data for: ${ioType} #${ioNum} after drop.`);
                alert("Error: Could not find the dropped IO Variable's data.");
            }
        }
    });

    // Add initialization for other lists/zones later
    console.log("Drag and drop initialized for IO Variables -> Conditions Drop Zone."); // Update log slightly
}

// Function to populate and show the Create Condition modal
function populateConditionModal(ioVariable) {
    const modalElement = document.getElementById('createConditionModal');
    if (!modalElement) {
        console.error("Create Condition Modal element not found!");
        return;
    }
    const modal = new bootstrap.Modal(modalElement); // Get Bootstrap modal instance

    // --- Get references to elements that need resetting for "Create" mode ---
    const modalTitle = document.getElementById('createConditionModalLabel');
    const deleteButton = document.getElementById('deleteConditionBtn');
    const saveButton = document.getElementById('saveConditionBtn');
    const editNumHidden = document.getElementById('conditionEditNum');
    const targetDisplaySpan = document.getElementById('displayConditionTarget'); // Get the new span

    // --- Reset modal to "Create" state ---
    modalTitle.textContent = 'Create New Condition'; // Default title
    deleteButton.style.display = 'none'; // Hide delete button
    saveButton.textContent = 'Save Condition'; // Default save button text
    editNumHidden.value = '0'; // Set edit number to 0 for new condition
    targetDisplaySpan.textContent = ''; // Clear the target display span initially


    // --- Reset form elements ---
    const form = document.getElementById('create-condition-form');
    form.reset(); // Reset standard form inputs
    // document.getElementById('conditionEditNum').value = '0'; // Explicitly set to 0 for new condition
    document.getElementById('conditionValueGroup').style.display = 'none'; // Hide value input initially

    // --- Populate hidden fields and display ---
    document.getElementById('conditionTargetIoType').value = dataTypesMap[ioVariable.t];
    document.getElementById('conditionTargetIoNum').value = ioVariable.n;
    // document.getElementById('conditionTargetDisplay').value = `${dataTypesMap[ioVariable.t]} #${ioVariable.n}: ${ioVariable.nm}`;
    targetDisplaySpan.textContent = `${dataTypesMap[ioVariable.t]} #${ioVariable.n}: ${ioVariable.nm || `IO ${ioVariable.n}`}`;


    // --- Dynamically populate comparison options ---
    const comparisonSelect = document.getElementById('conditionComparison');
    comparisonSelect.innerHTML = '<option value="" disabled selected>-- Select Comparison --</option>'; // Clear existing options and add placeholder

    // Define ALL available comparisons (matches enums in dataStructure.h)
    const options = [
        { value: 0, text: 'is True (State)' },
        { value: 1, text: 'is False (State)' },
        { value: 2, text: 'is Equal To (Value)' },
        { value: 3, text: 'is Less Than (Value)' },
        { value: 4, text: 'is Greater Than (Value)' },
        { value: 5, text: 'Flag is True' },
        { value: 6, text: 'Flag is False' }
    ];


    // Add options to the select dropdown
    options.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.textContent = opt.text;
        comparisonSelect.appendChild(optionElement);
    });

    // --- Show the modal ---
    modal.show();
}


// Function to handle saving a new or updated condition from the modal
function saveCondition() {
    const modalElement = document.getElementById('createConditionModal');
    const form = document.getElementById('create-condition-form');

    // --- Read data from the modal form ---
    const targetIoTypeStr = document.getElementById('conditionTargetIoType').value;
    const targetIoNum = parseInt(document.getElementById('conditionTargetIoNum').value, 10);
    const comparisonValue = document.getElementById('conditionComparison').value; // String value
    const conditionValueInput = document.getElementById('conditionValue');
    const conditionValue = conditionValueInput.parentElement.style.display !== 'none'
        ? parseInt(conditionValueInput.value, 10) || 0 // Use 0 if parsing fails or hidden
        : 0; // Default to 0 if value field is hidden
    const editConNum = parseInt(document.getElementById('conditionEditNum').value, 10); // *** Get the condition number being edited ***

    // --- Basic Validation ---
    if (!targetIoTypeStr || isNaN(targetIoNum) || comparisonValue === "") {
        alert("Error: Missing required condition information (Target IO or Comparison).");
        return;
    }

    // Convert targetIoTypeStr back to its numeric enum value
    const targetIoTypeNum = Object.keys(dataTypesMap).find(key => dataTypesMap[key] === targetIoTypeStr);
    if (targetIoTypeNum === undefined) {
        alert("Error: Invalid Target IO Type.");
        return;
    }

    let conditionToUpdate = null;
    let isNewCondition = false;

    // --- Determine if creating new or editing existing ---
    if (editConNum > 0) {
        // --- Editing existing condition ---
        conditionToUpdate = currentConfig.conditions.find(c => c.cn === editConNum);
        if (!conditionToUpdate) {
            alert(`Error: Could not find Condition C${editConNum} to update.`);
            console.error(`Save failed: Condition C${editConNum} not found in currentConfig.`);
            return;
        }
        console.log(`Updating existing Condition C${editConNum}`);
    } else {
        // --- Creating new condition ---
        isNewCondition = true;
        // Find the first available (inactive) condition slot
        let conditionIndex = -1;
        for (let i = 0; i < currentConfig.conditions.length; i++) {
            if (!currentConfig.conditions[i].s) { // Find first where status (s) is false
                conditionIndex = i;
                break;
            }
        }

        if (conditionIndex === -1) {
            alert("Error: Maximum number of conditions reached. Cannot create new condition.");
            // TODO: Potentially increase MAX_CONDITIONS if needed, or provide better feedback
            return;
        }
        conditionToUpdate = currentConfig.conditions[conditionIndex];
        console.log(`Creating new condition in slot C${conditionToUpdate.cn}`);
    }

    // --- Update the condition object in currentConfig ---
    conditionToUpdate.t = parseInt(targetIoTypeNum, 10); // Numeric type
    conditionToUpdate.tn = targetIoNum;
    conditionToUpdate.cp = parseInt(comparisonValue, 10); // Numeric comparison enum
    conditionToUpdate.v = conditionValue;
    conditionToUpdate.s = true; // Ensure status is active (important for both create and update)

    console.log(`Saved condition C${conditionToUpdate.cn}:`, conditionToUpdate);

    // --- Close the modal ---
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }

    // --- Refresh the conditions list display ---
    displayConditions();
}



// Function to display active conditions in the UI list (NEW 3-BADGE VERSION)
function displayConditions() {
    const listElement = document.getElementById('conditions-list');
    if (!listElement) {
        console.error("Conditions list element not found!");
        return;
    }

    listElement.innerHTML = ''; // Clear existing list items

    if (!currentConfig.conditions || !Array.isArray(currentConfig.conditions)) {
        console.warn("Conditions data is missing or not an array.");
        return;
    }

    currentConfig.conditions.forEach(cond => {
        if (cond.s) { // Only display if status (s) is true (active)
            const listItem = document.createElement('li');
            // Add classes for styling and identification - similar to io-variable-item
            listItem.className = 'list-group-item py-2 px-2 d-flex justify-content-between align-items-center condition-item';
            listItem.dataset.conNum = cond.cn; // Store condition number

            // --- Find the target IO Variable for context ---
            const targetIo = currentConfig.ioVariables.find(io => io.t === cond.t && io.n === cond.tn);
            const targetIoName = targetIo ? targetIo.nm : `IO ${cond.tn}`; // Use name or fallback
            const targetIoTypeStr = dataTypesMap[cond.t] || `Type ${cond.t}`;
            const targetIoTooltip = targetIo ? `${targetIoTypeStr} #${cond.tn}: ${targetIo.nm}` : `Unknown IO (Type ${cond.t}, Num ${cond.tn})`;

            // --- Get badge details using helper functions ---
            const badge1 = getConditionBadge1(cond.cp);
            const badge2 = getConditionBadge2(cond.cp);
            const badge3 = getConditionBadge3(cond.cp, cond.v);

            // --- Build the inner HTML using the new structure ---
            listItem.innerHTML = `
                <span class="condition-number fs-5 fw-bold me-2" title="Condition Number ${cond.cn}">C${cond.cn}</span>
                <div class="flex-grow-1 me-2 d-flex flex-column gap-0">
                    <div class="condition-target-name small text-truncate" title="Target: ${targetIoTooltip}">${targetIoName}</div>
                    <div class="condition-badges">
                        <span class="badge ${badge1.class}" title="${badge1.title}">${badge1.text}</span>
                        <span class="badge ${badge2.class}" title="${badge2.title}">${badge2.text}</span>
                        <span class="badge ${badge3.class}" title="${badge3.title}">${badge3.text}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-condition-btn fs-6 p-1" title="Edit Condition C${cond.cn}"
                    data-bs-toggle="modal" data-bs-target="#createConditionModal"
                    data-con-num="${cond.cn}">
                    ⚙️
                </button>

            `;

            // Add the fully constructed list item to the list

            listElement.appendChild(listItem);
        }
    });

    // --- Attach listeners to the newly created delete buttons ---
    // attachDeleteConditionListeners(); // Make sure this function exists and works
    attachEditConditionListeners();
}

// Ensure these helper functions for delete exist (from previous step or add them now)
// function attachDeleteConditionListeners() {
//     document.querySelectorAll('.delete-condition-btn').forEach(button => {
//         // Remove existing listener first to prevent duplicates if function is called multiple times
//         button.removeEventListener('click', handleDeleteConditionClick);
//         button.addEventListener('click', handleDeleteConditionClick);
//     });
// }

// function handleDeleteConditionClick(event) {
//     const button = event.currentTarget;
//     const listItem = button.closest('.condition-item');
//     const conNum = parseInt(listItem.dataset.conNum, 10);

//     if (confirm(`Are you sure you want to delete Condition C${conNum}? This will mark it inactive.`)) {
//         // Find the condition in the config
//         const condition = currentConfig.conditions.find(c => c.cn === conNum);
//         if (condition) {
//             condition.s = false; // Mark as inactive
//             // IMPORTANT TODO: Also need to remove this condition's conNum from any conditionGroups that use it.
//             // This requires iterating through currentConfig.conditionGroups and modifying their 'ca' arrays.
//             // We will handle this logic later when implementing group editing.
//             console.log(`Marked Condition C${conNum} as inactive.`);
//             displayConditions(); // Refresh the list
//             // Note: Changes are only in memory until "Save Configuration" is clicked.
//         } else {
//             console.error(`Could not find Condition C${conNum} to mark inactive.`);
//         }
//     }
// }

// Function to attach listeners to condition edit buttons
function attachEditConditionListeners() {
    document.querySelectorAll('.edit-condition-btn').forEach(button => {
        // Remove existing listener to prevent duplicates
        button.removeEventListener('click', handleEditConditionClick);
        // Add the listener
        button.addEventListener('click', handleEditConditionClick);
    });
}

// Handler for when a condition edit button (⚙️) is clicked
function handleEditConditionClick(event) {
    const button = event.currentTarget;
    const conNum = parseInt(button.dataset.conNum, 10);

    console.log(`Edit button clicked for Condition C${conNum}`); // Placeholder log

    const condition = currentConfig.conditions.find(c => c.cn === conNum && c.s); // Find the active condition

    if (condition) {
        // *** Call the function to populate the modal for editing ***
        populateConditionModalForEdit(condition);
    } else {
        console.error(`Could not find active Condition data for: C${conNum}`);
        alert("Error: Could not load condition data for editing.");
        event.stopPropagation(); // Stop the modal from opening if data isn't found
    }

    // Note: The modal is shown automatically by data-bs-toggle attribute on the button
    // unless we stop propagation.
}

// Function to handle deleting (marking inactive) a condition from the modal
function handleDeleteCondition() {
    const modalElement = document.getElementById('createConditionModal');
    const editConNumInput = document.getElementById('conditionEditNum');
    const conNum = parseInt(editConNumInput.value, 10);

    if (isNaN(conNum) || conNum <= 0) {
        console.error("Invalid condition number found for deletion:", editConNumInput.value);
        alert("Error: Cannot determine which condition to delete.");
        return;
    }

    if (confirm(`Are you sure you want to delete Condition C${conNum}? This will mark it inactive.`)) {
        // Find the condition in the config
        const condition = currentConfig.conditions.find(c => c.cn === conNum);
        if (condition) {
            condition.s = false; // Mark as inactive
            // IMPORTANT TODO: Also need to remove this condition's conNum from any conditionGroups that use it.
            // This requires iterating through currentConfig.conditionGroups and modifying their 'ca' arrays.
            // We will handle this logic later when implementing group editing.
            console.log(`Marked Condition C${conNum} as inactive.`);

            // Close the modal
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Refresh the list
            displayConditions();
            // Note: Changes are only in memory until "Save Configuration" is clicked.
        } else {
            console.error(`Could not find Condition C${conNum} to mark inactive.`);
            alert(`Error: Could not find Condition C${conNum} to delete.`);
        }
    }
}


// Function to populate and show the Create/Edit Condition modal FOR EDITING
function populateConditionModalForEdit(condition) {
    const modalElement = document.getElementById('createConditionModal');
    if (!modalElement) {
        console.error("Create/Edit Condition Modal element not found!");
        return;
    }
    // Note: Modal instance is usually handled by the button click, but good to have reference
    // const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    // --- Get references to modal elements ---
    const modalTitle = document.getElementById('createConditionModalLabel');
    const form = document.getElementById('create-condition-form');
    const targetIoTypeHidden = document.getElementById('conditionTargetIoType');
    const targetIoNumHidden = document.getElementById('conditionTargetIoNum');
    const editNumHidden = document.getElementById('conditionEditNum');
    const targetDisplaySpan = document.getElementById('displayConditionTarget');
    const comparisonSelect = document.getElementById('conditionComparison');
    const valueGroup = document.getElementById('conditionValueGroup');
    const valueInput = document.getElementById('conditionValue');
    const deleteButton = document.getElementById('deleteConditionBtn');
    const saveButton = document.getElementById('saveConditionBtn');

    // --- Reset form (good practice before populating) ---
    form.reset(); // Resets standard inputs, select needs manual setting

    // --- Populate fields with existing condition data ---
    modalTitle.textContent = `Edit Condition C${condition.cn}`; // Set title for editing
    editNumHidden.value = condition.cn; // Store the condition number being edited

    // Find the target IO variable details
    const targetIo = currentConfig.ioVariables.find(io => io.t === condition.t && io.n === condition.tn);
    const targetIoName = targetIo ? targetIo.nm : `IO ${condition.tn}`;
    const targetIoTypeStr = dataTypesMap[condition.t] || `Type ${condition.t}`;

    targetIoTypeHidden.value = targetIoTypeStr;
    targetIoNumHidden.value = condition.tn;
    targetDisplaySpan.textContent = `${targetIoTypeStr} #${condition.tn}: ${targetIoName}`; // Set the display span

    // --- Populate and select the comparison dropdown ---
    // (We reuse the logic from populateConditionModal but add selection)
    comparisonSelect.innerHTML = '<option value="" disabled>-- Select Comparison --</option>'; // Clear existing
    const options = [ // Same options as before
        { value: 0, text: 'is True (State)' },
        { value: 1, text: 'is False (State)' },
        { value: 2, text: 'is Equal To (Value)' },
        { value: 3, text: 'is Less Than (Value)' },
        { value: 4, text: 'is Greater Than (Value)' },
        { value: 5, text: 'Flag is True' },
        { value: 6, text: 'Flag is False' }
    ];
    options.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.textContent = opt.text;
        comparisonSelect.appendChild(optionElement);
    });
    comparisonSelect.value = condition.cp; // *** Select the condition's comparison type ***

    // --- Populate and show/hide the value input ---
    valueInput.value = condition.v; // Set the value
    if ([2, 3, 4].includes(condition.cp)) { // Show if comparison uses value
        valueGroup.style.display = 'block';
    } else {
        valueGroup.style.display = 'none';
    }

    // --- Adjust modal appearance for editing ---
    deleteButton.style.display = 'block'; // *** Show the delete button ***
    saveButton.textContent = 'Update Condition'; // Change save button text

    // Note: The modal should be shown automatically by the button's data-bs-toggle attribute
    // modal.show(); // Usually not needed here
}


// --- NEW: Function to populate the Digital Input Edit Modal ---
// (Moved logic from handleEditButtonClick here for clarity)
function populateDiEditModal(ioVariable) {
    const modal = document.getElementById('editIoVariableModal');
    const typeStr = dataTypesMap[ioVariable.t]; // Should be "DigitalInput"
    const num = ioVariable.n;

    modal.querySelector('#editIoVariableModalLabel').textContent = `Edit ${typeStr} #${num}`;
    modal.querySelector('#editIoType').value = typeStr;
    modal.querySelector('#editIoNum').value = num;
    modal.querySelector('#displayIoDiNum').textContent = num;
    modal.querySelector('#editIoName').value = ioVariable.nm;
    modal.querySelector('#editIoMode').value = ioVariable.m; // Set the mode dropdown
    modal.querySelector('#editIoStatus').checked = ioVariable.s;

    // TODO: Dynamically populate DI modes if they differ significantly in the future
}

// --- NEW: Function to populate the Digital Output Edit Modal ---
function populateDoEditModal(ioVariable) {
    const modal = document.getElementById('editDoVariableModal'); // Target the DO modal
    const typeStr = dataTypesMap[ioVariable.t]; // Should be "DigitalOutput"
    const num = ioVariable.n;

    modal.querySelector('#editDoVariableModalLabel').textContent = `Edit ${typeStr} #${num}`; // Use DO label ID
    modal.querySelector('#editDoType').value = typeStr; // Use DO hidden field ID
    modal.querySelector('#editDoNum').value = num;      // Use DO hidden field ID
    modal.querySelector('#displayDoNum').textContent = num; // Use DO display span ID
    modal.querySelector('#editDoName').value = ioVariable.nm; // Use DO name input ID
    modal.querySelector('#editDoStatus').checked = ioVariable.s; // Use DO status switch ID

    // Populate DO modes (can be simpler if only a few)
    const modeSelect = modal.querySelector('#editDoMode'); // Use DO mode select ID
    modeSelect.innerHTML = ''; // Clear existing options

    // Add relevant modes for Digital Outputs
    const doModes = {
        0: 'None', // Default/Volatile
        4: 'Pulse' // Pulse mode
        // Add other DO-specific modes here if defined in C++
    };

    for (const [value, text] of Object.entries(doModes)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modeSelect.appendChild(option);
    }
    modeSelect.value = ioVariable.m; // Set the current selection
}

// --- NEW: Function to populate the Analog Input Edit Modal ---
function populateAiEditModal(ioVariable) {
    const modal = document.getElementById('editAiVariableModal'); // Target the AI modal
    const typeStr = dataTypesMap[ioVariable.t]; // Should be "AnalogInput"
    const num = ioVariable.n;

    modal.querySelector('#editAiVariableModalLabel').textContent = `Edit ${typeStr} #${num}`; // Use AI label ID
    modal.querySelector('#editAiType').value = typeStr; // Use AI hidden field ID
    modal.querySelector('#editAiNum').value = num;      // Use AI hidden field ID
    modal.querySelector('#displayAiNum').textContent = num; // Use AI display span ID
    modal.querySelector('#editAiName').value = ioVariable.nm; // Use AI name input ID
    modal.querySelector('#editAiStatus').checked = ioVariable.s; // Use AI status switch ID

    // Populate AI modes
    const modeSelect = modal.querySelector('#editAiMode'); // Use AI mode select ID
    modeSelect.innerHTML = ''; // Clear existing options

    // Add relevant modes for Analog Inputs (from operationModeMap/enum)
    const aiModes = {
        0: operationModeMap[0], // 'None (Raw ADC)'
        8: operationModeMap[8]  // 'Scaled (0-100%)'
        // Add other AI-specific modes here if defined in C++
    };

    for (const [value, text] of Object.entries(aiModes)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modeSelect.appendChild(option);
    }
    modeSelect.value = ioVariable.m; // Set the current selection
}

// --- NEW: Function to populate the SoftIO Edit Modal ---
function populateSoftIoEditModal(ioVariable) {
    const modal = document.getElementById('editSoftIoVariableModal');
    const typeStr = dataTypesMap[ioVariable.t]; // "SoftIO"
    const num = ioVariable.n;

    modal.querySelector('#editSoftIoVariableModalLabel').textContent = `Edit ${typeStr} #${num}`;
    modal.querySelector('#editSoftIoType').value = typeStr;
    modal.querySelector('#editSoftIoNum').value = num;
    modal.querySelector('#displaySoftIoNum').textContent = num;
    modal.querySelector('#editSoftIoName').value = ioVariable.nm;
    modal.querySelector('#editSoftIoStatus').checked = ioVariable.s;

    // Populate SoftIO modes
    const modeSelect = modal.querySelector('#editSoftIoMode');
    modeSelect.innerHTML = ''; // Clear existing options

    const softIoModes = {
        0: operationModeMap[0], // 'None (Volatile)'
        9: operationModeMap[9]  // 'Persistent'
    };

    for (const [value, text] of Object.entries(softIoModes)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modeSelect.appendChild(option);
    }
    modeSelect.value = ioVariable.m; // Set current selection
}


// --- Function to handle saving changes from the DO Variable modal ---
function saveDoVariableChanges() {
    const modal = document.getElementById('editDoVariableModal'); // Target DO modal

    // Read identifiers
    const typeStr = modal.querySelector('#editDoType').value; // Read from DO modal
    const num = parseInt(modal.querySelector('#editDoNum').value, 10); // Read from DO modal

    // Read new values
    const newName = modal.querySelector('#editDoName').value; // Read from DO modal
    const newMode = parseInt(modal.querySelector('#editDoMode').value, 10); // Read from DO modal
    const newStatus = modal.querySelector('#editDoStatus').checked; // Read from DO modal

    // Find the IOVariable object
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // Update the object in currentConfig
        ioVariable.nm = newName;
        ioVariable.m = newMode;
        ioVariable.s = newStatus;

        console.log(`Updated ${typeStr} #${num} in currentConfig:`, ioVariable);

        // Close the modal
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        } else { // Fallback
            modal.classList.remove('show');
            modal.style.display = 'none';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }

        // Refresh the UI list
        populateIoVariables(currentConfig.ioVariables);

    } else {
        console.error(`Could not find IOVariable to save: ${typeStr} #${num}`);
        alert("Error: Could not save changes. IO Variable not found.");
    }
}

// --- NEW: Function to handle saving changes from the AI Variable modal ---
function saveAiVariableChanges() {
    const modal = document.getElementById('editAiVariableModal'); // Target AI modal

    // Read identifiers
    const typeStr = modal.querySelector('#editAiType').value; // Read from AI modal
    const num = parseInt(modal.querySelector('#editAiNum').value, 10); // Read from AI modal

    // Read new values
    const newName = modal.querySelector('#editAiName').value; // Read from AI modal
    const newMode = parseInt(modal.querySelector('#editAiMode').value, 10); // Read from AI modal
    const newStatus = modal.querySelector('#editAiStatus').checked; // Read from AI modal

    // Find the IOVariable object
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // Update the object in currentConfig
        ioVariable.nm = newName;
        ioVariable.m = newMode;
        ioVariable.s = newStatus;

        console.log(`Updated ${typeStr} #${num} in currentConfig:`, ioVariable);

        // Close the modal
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        } else { // Fallback
            modal.classList.remove('show');
            modal.style.display = 'none';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }

        // Refresh the UI list
        populateIoVariables(currentConfig.ioVariables);

    } else {
        console.error(`Could not find IOVariable to save: ${typeStr} #${num}`);
        alert("Error: Could not save changes. IO Variable not found.");
    }
}

// --- NEW: Function to populate the Timer Edit Modal ---
function populateTimerEditModal(ioVariable) {
    const modal = document.getElementById('editTimerVariableModal');
    const typeStr = dataTypesMap[ioVariable.t]; // "Timer"
    const num = ioVariable.n;

    modal.querySelector('#editTimerVariableModalLabel').textContent = `Edit ${typeStr} #${num}`;
    modal.querySelector('#editTimerType').value = typeStr;
    modal.querySelector('#editTimerNum').value = num;
    modal.querySelector('#displayTimerNum').textContent = num;
    modal.querySelector('#editTimerName').value = ioVariable.nm;
    modal.querySelector('#editTimerStatus').checked = ioVariable.s;

    // Populate Timer modes
    const modeSelect = modal.querySelector('#editTimerMode');
    modeSelect.innerHTML = ''; // Clear existing options

    const timerModes = {
        5: operationModeMap[5], // 'One Shot'
        6: operationModeMap[6]  // 'Repeating'
    };

    for (const [value, text] of Object.entries(timerModes)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modeSelect.appendChild(option);
    }
    modeSelect.value = ioVariable.m; // Set current selection

    // NOTE: We are NOT populating the preset value field here, as it was removed from HTML.
}

// --- NEW: Function to handle saving changes from the SoftIO Variable modal ---
function saveSoftIoVariableChanges() {
    const modal = document.getElementById('editSoftIoVariableModal');

    // Read identifiers
    const typeStr = modal.querySelector('#editSoftIoType').value;
    const num = parseInt(modal.querySelector('#editSoftIoNum').value, 10);

    // Read new values
    const newName = modal.querySelector('#editSoftIoName').value;
    const newMode = parseInt(modal.querySelector('#editSoftIoMode').value, 10);
    const newStatus = modal.querySelector('#editSoftIoStatus').checked;

    // Find the IOVariable object
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // Update the object in currentConfig
        ioVariable.nm = newName;
        ioVariable.m = newMode;
        ioVariable.s = newStatus;
        // Note: SoftIO 'value' and 'state' are runtime, not set here. 'flag' might be set by actions.

        console.log(`Updated ${typeStr} #${num} in currentConfig:`, ioVariable);

        // Close the modal
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) modalInstance.hide();
        else { /* Fallback code */ } // Keep fallback for safety

        // Refresh the UI list
        populateIoVariables(currentConfig.ioVariables);

    } else {
        console.error(`Could not find IOVariable to save: ${typeStr} #${num}`);
        alert("Error: Could not save changes. IO Variable not found.");
    }
}

// --- NEW: Function to handle saving changes from the Timer Variable modal ---
function saveTimerVariableChanges() {
    const modal = document.getElementById('editTimerVariableModal');

    // Read identifiers
    const typeStr = modal.querySelector('#editTimerType').value;
    const num = parseInt(modal.querySelector('#editTimerNum').value, 10);

    // Read new values
    const newName = modal.querySelector('#editTimerName').value;
    const newMode = parseInt(modal.querySelector('#editTimerMode').value, 10);
    const newStatus = modal.querySelector('#editTimerStatus').checked;
    // NOTE: We are NOT reading the preset value here.

    // Find the IOVariable object
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // Update the object in currentConfig
        ioVariable.nm = newName;
        ioVariable.m = newMode;
        ioVariable.s = newStatus;
        // Note: Timer 'value' (current count), 'state' (running), and 'flag' (expired) are runtime.
        // The preset value will be set via an Action later.

        console.log(`Updated ${typeStr} #${num} in currentConfig:`, ioVariable);

        // Close the modal
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) modalInstance.hide();
        else { /* Fallback code */ } // Keep fallback

        // Refresh the UI list
        populateIoVariables(currentConfig.ioVariables);

    } else {
        console.error(`Could not find IOVariable to save: ${typeStr} #${num}`);
        alert("Error: Could not save changes. IO Variable not found.");
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadConfig(); // Load config when the page is ready
    const saveButton = document.getElementById('saveConfigBtn');
    if (saveButton) {
        saveButton.addEventListener('click', saveConfig);
    }
    const saveIoBtn = document.getElementById('saveIoChangesBtn'); // DI Save Button
    if (saveIoBtn) {
        saveIoBtn.addEventListener('click', saveIoVariableChanges);
    }
    const saveDoBtn = document.getElementById('saveDoChangesBtn'); // DO Save Button
    if (saveDoBtn) {
        saveDoBtn.addEventListener('click', saveDoVariableChanges); // Call the new function
    }
    const saveAiBtn = document.getElementById('saveAiChangesBtn'); // AI Save Button
    if (saveAiBtn) {
        saveAiBtn.addEventListener('click', saveAiVariableChanges); // Call the new AI save function
    }
    const saveSoftIoBtn = document.getElementById('saveSoftIoChangesBtn'); // SoftIO Save Button
    if (saveSoftIoBtn) {
        saveSoftIoBtn.addEventListener('click', saveSoftIoVariableChanges); // Call SoftIO save function
    }
    const saveTimerBtn = document.getElementById('saveTimerChangesBtn'); // Timer Save Button
    if (saveTimerBtn) {
        saveTimerBtn.addEventListener('click', saveTimerVariableChanges); // Call Timer save function
    }
    const deleteConditionButton = document.getElementById('deleteConditionBtn');
    if (deleteConditionButton) {
        deleteConditionButton.addEventListener('click', handleDeleteCondition); // Attach the delete handler
    }


    // --- ADD THESE LISTENERS BACK ---
    // Listener for the Condition Comparison dropdown
    const conditionComparisonSelect = document.getElementById('conditionComparison');
    const conditionValueGroup = document.getElementById('conditionValueGroup');

    if (conditionComparisonSelect && conditionValueGroup) {
        conditionComparisonSelect.addEventListener('change', function () {
            const selectedComparison = parseInt(this.value, 10);
            // Comparisons requiring a value: isEqual(2), isLess(3), isGreater(4)
            if ([2, 3, 4].includes(selectedComparison)) {
                conditionValueGroup.style.display = 'block'; // Show the value input
            } else {
                conditionValueGroup.style.display = 'none'; // Hide the value input
            }
        });
    } else {
        console.error("Could not find condition modal comparison or value elements to attach listener.");
    }

    // Listener for the Save Condition button in the modal
    const saveConditionButton = document.getElementById('saveConditionBtn');
    if (saveConditionButton) {
        saveConditionButton.addEventListener('click', saveCondition); // Attach the saveCondition function
    } else {
        console.error("Could not find Save Condition button element.");
    }
    // --- END OF ADDED LISTENERS ---

});

