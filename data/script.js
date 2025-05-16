// Global variable to hold the entire configuration fetched from the ESP32
let currentConfig = {};

let ioVariableSortable = null; // To hold the Sortable instance

let currentEditingConditionGroupNum = 0;

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
    4: 'Start Delay',   // DO
    5: 'One Shot',      // Timer
    6: 'Repeating',     // Timer
    7: 'Auto Off',      // DO
    8: 'Scaled (0-100%)', // AI
    9: 'Persistent'     // SoftIO
};
const operationModeShortMap = {
    0: 'None', // Default/Raw/Volatile
    1: 'Rise', // DI
    2: 'Fall', // DI
    3: 'StCh', // DI
    4: 'StDly',// DO
    5: 'Once', // Timer
    6: 'Rept', // Timer
    7: 'DlOf',// DO
    8: 'Scle', // AI
    9: 'Pers'  // SoftIO
};
const actionTypeMap = {
    0: 'Set',           // Set state/flag true
    1: 'Reset',         // Set state/flag false
    2: 'Set Value',     // Set numerical value
    3: 'Increment',     // Increment numerical value
    4: 'Decrement',     // Decrement numerical value
    5: 'Set Flag',      // Set IOVariable flag true
    6: 'Clear'          // Clear IOVariable flag / Reset Timer
};

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

function getActionBadge1(actionType) {
    switch (actionType) {
        case 0: // set (state)
        case 1: // reset (state)
            return { text: 'State', class: 'bg-primary', title: 'Affects IO Variable State' };
        case 2: // setValue
        case 3: // increment
        case 4: // decrement
            return { text: 'Value', class: 'bg-info text-dark', title: 'Affects IO Variable Value' };
        case 5: // setFlag
        case 6: // clear (flag or timer)
            return { text: 'Flag', class: 'bg-warning text-dark', title: 'Affects IO Variable Flag' };
        default:
            return { text: 'Attr?', class: 'bg-secondary', title: 'Unknown Attribute' };
    }
}

function getActionBadge2(actionType) {
    switch (actionType) {
        case 0: // set
        case 1: // reset
        case 2: // setValue
        case 5: // setFlag
        case 6: // clear
            return { text: '=', class: 'bg-success', title: 'Assignment' };
        case 3: // increment
            return { text: '+', class: 'bg-success', title: 'Increment' };
        case 4: // decrement
            return { text: '-', class: 'bg-success', title: 'Decrement' };
        default:
            return { text: 'Op?', class: 'bg-secondary', title: 'Unknown Operation' };
    }
}

function getActionBadge3(actionType, value) {
    switch (actionType) {
        case 0: // set
        case 5: // setFlag
            return { text: 'High', class: 'bg-success', title: 'Target: True / High' };
        case 1: // reset
        case 6: // clear
            return { text: 'Low', class: 'bg-danger', title: 'Target: False / Low' };
        case 2: // setValue
        case 3: // increment (value indicates amount)
        case 4: // decrement (value indicates amount)
            return { text: value, class: 'bg-purple', title: `Value: ${value}` };
        default:
            return { text: 'Tgt?', class: 'bg-secondary', title: 'Unknown Target' };
    }
}

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
        displayActions();
        displayConditionGroups();
        displayActionGroups();
        // Later, add calls here to populate other sections (IOs, Rules, etc.)

    } catch (error) {
        console.error("Error fetching configuration:", error);
        alert("Error loading configuration from device.");
    }
}

function populateDeviceSettingsForm(settings) {
    if (!settings) return; // Handle case where deviceSettings might be missing

    document.getElementById('deviceName').value = settings.DeviceName || '';
    document.getElementById('wifiSSID').value = settings.SSID || '';
    document.getElementById('wifiPassword').value = settings.PASS || ''; // Populate password
    document.getElementById('runProgram').checked = settings.run || false;
}

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

function attachEditButtonListeners() {
    document.querySelectorAll('.edit-io-btn').forEach(button => {
        // Remove existing listener to prevent duplicates if re-populating
        // (Good practice, though maybe not strictly needed if innerHTML clears everything)
        button.removeEventListener('click', handleEditButtonClick);
        // Add the listener
        button.addEventListener('click', handleEditButtonClick);
    });
}

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

function initializeDragAndDrop() {
    const diList = document.getElementById('digital-inputs-list');
    const doList = document.getElementById('digital-outputs-list');
    const aiList = document.getElementById('analog-inputs-list');
    const softioList = document.getElementById('softio-list');
    const timersList = document.getElementById('timers-list');
    const conditionsDropZone = document.getElementById('conditions-drop-zone');
    const actionsDropZone = document.getElementById('actions-drop-zone');
    const conditionsList = document.getElementById('conditions-list'); // The source list of all conditions
    const conditionGroupEditorDropZone = document.getElementById('condition-group-drop-zone');
    const editableConditionGroupMembersUL = document.getElementById('editable-condition-group-members');
    // Get other lists/zones later as needed

    if (!diList || !doList || !aiList || !softioList || !timersList ||
        !conditionsDropZone || !actionsDropZone ||
        !conditionsList || !conditionGroupEditorDropZone || !editableConditionGroupMembersUL) { // <-- UPDATED CHECK
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

    new Sortable(conditionsDropZone, {
        group: {
            name: 'io-logic', // Allows dropping from DI or DO list
            pull: false,
            put: true
        },
        animation: 150,
        sort: false,
        onAdd: function (evt) {
            const itemEl = evt.item;
            const originalList = evt.from;
            const ioType = itemEl.dataset.type;
            const ioNum = itemEl.dataset.num;

            console.log(`Dropped IO Variable: Type=${ioType}, Num=${ioNum} onto Conditions zone.`);
            itemEl.remove(); // Remove the clone

            const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === ioType && io.n === parseInt(ioNum, 10));

            if (ioVariable) {
                populateConditionModal(ioVariable);
            } else {
                console.error(`Could not find IOVariable data for: ${ioType} #${ioNum} after drop.`);
                alert("Error: Could not find the dropped IO Variable's data.");
            }
        }
    });

    new Sortable(actionsDropZone, {
        group: {
            name: 'io-logic', // Allows dropping from any list in the 'io-logic' group
            pull: false,      // Cannot drag items out of this zone
            put: true         // Allows items to be dropped into this zone
        },
        animation: 150,
        sort: false, // Don't allow sorting within the drop zone itself
        onAdd: function (evt) {
            const itemEl = evt.item; // The dragged element (clone)
            const ioType = itemEl.dataset.type; // e.g., "DigitalOutput"
            const ioNum = itemEl.dataset.num;   // e.g., "1"

            console.log(`Dropped IO Variable: Type=${ioType}, Num=${ioNum} onto Actions zone.`);
            itemEl.remove(); // Remove the clone from the DOM
            const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === ioType && io.n === parseInt(ioNum, 10));

            if (ioVariable) {
                populateActionModal(ioVariable);
            } else {
                console.error(`Could not find IOVariable data for: ${ioType} #${ioNum} after drop.`);
                alert("Error: Could not find the dropped IO Variable's data.");
            }
        }
    });

    new Sortable(conditionsList, {
        group: {
            name: 'conditions-to-group', // A new group name for this interaction
            pull: 'clone', // Clone the item when dragging
            put: false     // Cannot drop items into this list from elsewhere
        },
        animation: 150,
        sort: false // Don't allow sorting within the main conditions-list itself
    });

    // --- NEW: Make the Condition Group Editor's drop zone a target ---
    new Sortable(conditionGroupEditorDropZone, {
        group: {
            name: 'conditions-to-group', // Must match the source list's group name
            pull: false, // Cannot drag items out of this drop zone
            put: true    // Allows items to be dropped into this zone
        },
        animation: 150,
        sort: false, // The drop zone itself is not for sorting
        onAdd: function (evt) {
            const itemEl = evt.item; // The dragged (cloned) condition item
            const conNum = parseInt(itemEl.dataset.conNum, 10);

            // Remove the visual clone from the drop zone immediately
            itemEl.remove();

            // Check if the editor is actually visible
            const editorDiv = document.getElementById('condition-group-editor');
            if (!editorDiv || editorDiv.style.display === 'none') {
                console.warn("Condition group editor is not visible. Drop ignored.");
                return;
            }

            // Find the actual condition data from currentConfig
            const conditionData = currentConfig.conditions.find(c => c.cn === conNum && c.s);

            if (conditionData) {
                // Use the helper function to add the condition to the editor's list.
                // This function handles duplicate checks, creating the LI,
                // removing placeholders, and attaching remove button listeners.
                addConditionToEditorList(conditionData);
                // The addConditionToEditorList function will log success or if it was a duplicate.
            } else {
                console.error(`Could not find active condition data for C${conNum}.`);
                alert(`Error: Could not find data for Condition C${conNum}. It might be inactive or deleted.`);
            }
        }
    });

    // --- NEW: Make the 'editable-condition-group-members' UL sortable for reordering ---
    new Sortable(editableConditionGroupMembersUL, {
        group: 'condition-group-members-internal', // A unique group name for internal sorting
        animation: 150,
        handle: '.condition-group-editor-member', // Optional: specify a handle if needed
        // onEnd: function (evt) { /* Logic to update order for saving, if needed immediately */ }
    });

    // Add initialization for other lists/zones later
    console.log("Drag and drop initialized for IO Variables -> Conditions Drop Zone."); // Update log slightly
}

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

function attachEditConditionListeners() {
    document.querySelectorAll('.edit-condition-btn').forEach(button => {
        // Remove existing listener to prevent duplicates
        button.removeEventListener('click', handleEditConditionClick);
        // Add the listener
        button.addEventListener('click', handleEditConditionClick);
    });
}

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

function displayActions() {
    const listElement = document.getElementById('actions-list'); // <<< Target actions-list
    if (!listElement) {
        console.error("Actions list element not found!"); // <<< Error message
        return;
    }

    listElement.innerHTML = ''; // Clear existing list items

    if (!currentConfig.actions || !Array.isArray(currentConfig.actions)) { // <<< Check actions data
        console.warn("Actions data is missing or not an array."); // <<< Warning message
        return;
    }

    currentConfig.actions.forEach(act => { // <<< Iterate through actions, use 'act'
        if (act.s) { // Only display if status (s) is true (active)
            const listItem = document.createElement('li');

            listItem.className = 'list-group-item py-2 px-2 d-flex justify-content-between align-items-center action-item'; // <<< action-item class
            listItem.dataset.actNum = act.an; // <<< Store action number (an)

            const targetIo = currentConfig.ioVariables.find(io => io.t === act.t && io.n === act.tn); // <<< Use act.t, act.tn
            const targetIoName = targetIo ? targetIo.nm : `IO ${act.tn}`; // <<< Use act.tn
            const targetIoTypeStr = dataTypesMap[act.t] || `Type ${act.t}`; // <<< Use act.t
            const targetIoTooltip = targetIo ? `${targetIoTypeStr} #${act.tn}: ${targetIo.nm}` : `Unknown IO (Type ${act.t}, Num ${act.tn})`; // <<< Use act.t, act.tn

            const badge1 = getActionBadge1(act.a);
            const badge2 = getActionBadge2(act.a);
            const badge3 = getActionBadge3(act.a, act.v);

            listItem.innerHTML = `
                <span class="action-number fs-5 fw-bold me-2" title="Action Number ${act.an}">A${act.an}</span>
                <div class="flex-grow-1 me-2 d-flex flex-column gap-0">
                    <div class="action-target-name small text-truncate" title="Target: ${targetIoTooltip}">${targetIoName}</div>
                    <div class="action-badges">
                        <span class="badge ${badge1.class}" title="${badge1.title}">${badge1.text}</span>
                        <span class="badge ${badge2.class}" title="${badge2.title}">${badge2.text}</span>
                        <span class="badge ${badge3.class}" title="${badge3.title}">${badge3.text}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-secondary edit-action-btn fs-6 p-1" title="Edit Action A${act.an}"
                    data-bs-toggle="modal" data-bs-target="#createActionModal"
                    data-act-num="${act.an}">
                    ⚙️
                </button>
            `;
            listElement.appendChild(listItem);
        }
    });

    // --- Attach listeners to the newly created edit buttons (Function to be created later) ---
    attachEditActionListeners(); // <<< Call function to attach listeners for action edit buttons
}

function populateActionModal(ioVariable) {
    const modalElement = document.getElementById('createActionModal');
    if (!modalElement) {
        console.error("Create Action Modal element not found!");
        return;
    }
    // Get Bootstrap modal instance (or create if needed)
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    // --- Get references to elements that need resetting for "Create" mode ---
    const modalTitle = document.getElementById('createActionModalLabel');
    const deleteButton = document.getElementById('deleteActionBtn');
    const saveButton = document.getElementById('saveActionBtn');
    const editNumHidden = document.getElementById('actionEditNum');
    const targetDisplaySpan = document.getElementById('displayActionTarget');
    const operationSelect = document.getElementById('actionOperation'); // <<< Action operation select
    const valueGroup = document.getElementById('actionValueGroup');     // <<< Action value group
    const valueInput = document.getElementById('actionValue');         // <<< Action value input

    // --- Reset modal to "Create" state ---
    modalTitle.textContent = 'Create New Action'; // Default title
    deleteButton.style.display = 'none';          // Hide delete button
    saveButton.textContent = 'Save Action';       // Default save button text
    editNumHidden.value = '0';                    // Set edit number to 0 for new action
    targetDisplaySpan.textContent = '';           // Clear the target display span initially

    // --- Reset form elements ---
    const form = document.getElementById('create-action-form');
    form.reset(); // Reset standard form inputs (clears valueInput too)
    valueGroup.style.display = 'none'; // Hide value input initially

    // --- Populate hidden fields and display ---
    const targetIoTypeStr = dataTypesMap[ioVariable.t]; // Get string like "DigitalOutput"
    document.getElementById('actionTargetIoType').value = targetIoTypeStr;
    document.getElementById('actionTargetIoNum').value = ioVariable.n;
    targetDisplaySpan.textContent = `${targetIoTypeStr} #${ioVariable.n}: ${ioVariable.nm || `IO ${ioVariable.n}`}`;

    // --- Dynamically populate action operation options ---
    operationSelect.innerHTML = '<option value="" disabled selected>-- Select Operation --</option>'; // Clear existing options and add placeholder

    // Define available actions based on target IO type (using numeric enum values)
    let availableActions = {};
    switch (ioVariable.t) {
        case 1: // DigitalOutput
            availableActions = {
                0: actionTypeMap[0], // Set (State)
                1: actionTypeMap[1], // Reset (State)
                2: actionTypeMap[2], // Set Value
                3: actionTypeMap[3], // Increment
                4: actionTypeMap[4], // Decrement
                5: actionTypeMap[5], // Set Flag
                6: actionTypeMap[6]  // Clear (Flag)
            };
            break;
        case 3: // SoftIO
            availableActions = {
                0: actionTypeMap[0], // Set (State)
                1: actionTypeMap[1], // Reset (State)
                2: actionTypeMap[2], // Set Value
                3: actionTypeMap[3], // Increment
                4: actionTypeMap[4], // Decrement
                5: actionTypeMap[5], // Set Flag
                6: actionTypeMap[6]  // Clear (Flag)
            };
            break;
        case 4: // Timer
            availableActions = {
                0: actionTypeMap[0], // Set (Start/Enable)
                1: actionTypeMap[1], // Reset (Stop/Disable)
                2: actionTypeMap[2], // Set Value (Preset)
                6: actionTypeMap[6]  // Clear (Reset Timer)
                // Note: Timers don't typically have flags set directly via actions
            };
            break;
        case 0: // DigitalInput (Flags only)
        case 2: // AnalogInput (Flags only)
            availableActions = {
                5: actionTypeMap[5], // Set Flag
                6: actionTypeMap[6]  // Clear (Flag)
            };
            break;
        default:
            console.warn(`No specific actions defined for IO type ${ioVariable.t} (${targetIoTypeStr})`);
            // Optionally add generic flag actions as a fallback
            availableActions = {
                5: actionTypeMap[5], // Set Flag
                6: actionTypeMap[6]  // Clear (Flag)
            };
            break;
    }

    // Add options to the select dropdown
    for (const [value, text] of Object.entries(availableActions)) {
        const optionElement = document.createElement('option');
        optionElement.value = value; // The numeric enum value
        optionElement.textContent = text; // The descriptive text from actionTypeMap
        operationSelect.appendChild(optionElement);
    }

    // --- Ensure listener for operation change is attached (will be done globally later) ---
    // We'll add the event listener that shows/hides the value input in a later step.

    // --- Show the modal ---
    modal.show();
}

function saveAction() {
    const modalElement = document.getElementById('createActionModal'); // <<< Action modal
    const form = document.getElementById('create-action-form');       // <<< Action form

    // --- Read data from the action modal form ---
    const targetIoTypeStr = document.getElementById('actionTargetIoType').value;
    const targetIoNum = parseInt(document.getElementById('actionTargetIoNum').value, 10);
    const actionOperationValue = document.getElementById('actionOperation').value; // String value
    const actionValueInput = document.getElementById('actionValue');
    const actionValueGroup = document.getElementById('actionValueGroup');
    const actionValue = actionValueGroup.style.display !== 'none'
        ? parseInt(actionValueInput.value, 10) || 0 // Use 0 if parsing fails or hidden
        : 0; // Default to 0 if value field is hidden
    const editActNum = parseInt(document.getElementById('actionEditNum').value, 10); // *** Get the action number being edited ***

    // --- Basic Validation ---
    if (!targetIoTypeStr || isNaN(targetIoNum) || actionOperationValue === "") {
        alert("Error: Missing required action information (Target IO or Operation).");
        return;
    }

    // Convert targetIoTypeStr back to its numeric enum value
    const targetIoTypeNum = Object.keys(dataTypesMap).find(key => dataTypesMap[key] === targetIoTypeStr);
    if (targetIoTypeNum === undefined) {
        alert("Error: Invalid Target IO Type.");
        return;
    }

    let actionToUpdate = null;
    let isNewAction = false;

    // --- Determine if creating new or editing existing ---
    if (editActNum > 0) {
        // --- Editing existing action ---
        actionToUpdate = currentConfig.actions.find(a => a.an === editActNum); // <<< Find by 'an'
        if (!actionToUpdate) {
            alert(`Error: Could not find Action A${editActNum} to update.`);
            console.error(`Save failed: Action A${editActNum} not found in currentConfig.`);
            return;
        }
        console.log(`Updating existing Action A${editActNum}`);
    } else {
        // --- Creating new action ---
        isNewAction = true;
        // Find the first available (inactive) action slot
        let actionIndex = -1;
        for (let i = 0; i < currentConfig.actions.length; i++) {
            if (!currentConfig.actions[i].s) { // Find first where status (s) is false
                actionIndex = i;
                break;
            }
        }

        if (actionIndex === -1) {
            alert("Error: Maximum number of actions reached. Cannot create new action.");
            // TODO: Potentially increase MAX_ACTIONS if needed
            return;
        }
        actionToUpdate = currentConfig.actions[actionIndex];
        console.log(`Creating new action in slot A${actionToUpdate.an}`); // <<< Use 'an'
    }

    // --- Update the action object in currentConfig ---
    actionToUpdate.t = parseInt(targetIoTypeNum, 10); // Numeric type
    actionToUpdate.tn = targetIoNum;
    actionToUpdate.a = parseInt(actionOperationValue, 10); // Numeric action enum ('a')
    actionToUpdate.v = actionValue;
    actionToUpdate.s = true; // Ensure status is active

    console.log(`Saved action A${actionToUpdate.an}:`, actionToUpdate); // <<< Use 'an'

    // --- Close the modal ---
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }

    // --- Refresh the actions list display ---
    displayActions(); // <<< Call displayActions
}

function attachEditActionListeners() {
    document.querySelectorAll('.edit-action-btn').forEach(button => {
        // Remove existing listener to prevent duplicates
        button.removeEventListener('click', handleEditActionClick); // <<< Use new handler name
        // Add the listener
        button.addEventListener('click', handleEditActionClick); // <<< Call new handler
    });
}

function handleEditActionClick(event) {
    const button = event.currentTarget;
    const actNum = parseInt(button.dataset.actNum, 10); // <<< Use data-act-num
    console.log(`Edit button clicked for Action A${actNum}`); // <<< Log action number
    const action = currentConfig.actions.find(a => a.an === actNum); // <<< Find by 'an'
    if (action) {
        populateActionModalForEdit(action); // <<< Call new function
    } else {
        console.error(`Could not find Action data for: A${actNum}`);
        alert("Error: Could not load action data for editing.");
        event.stopPropagation(); // Prevent the modal from opening if data is missing
    }
}

function populateActionModalForEdit(action) {
    const modalElement = document.getElementById('createActionModal'); // <<< Action modal
    if (!modalElement) {
        console.error("Create/Edit Action Modal element not found!");
        return;
    }

    // --- Get references to modal elements ---
    const modalTitle = document.getElementById('createActionModalLabel');
    const form = document.getElementById('create-action-form');
    const targetIoTypeHidden = document.getElementById('actionTargetIoType');
    const targetIoNumHidden = document.getElementById('actionTargetIoNum');
    const editNumHidden = document.getElementById('actionEditNum');
    const targetDisplaySpan = document.getElementById('displayActionTarget');
    const operationSelect = document.getElementById('actionOperation'); // <<< Action operation select
    const valueGroup = document.getElementById('actionValueGroup');     // <<< Action value group
    const valueInput = document.getElementById('actionValue');         // <<< Action value input
    const deleteButton = document.getElementById('deleteActionBtn');     // <<< Action delete button
    const saveButton = document.getElementById('saveActionBtn');         // <<< Action save button

    form.reset(); // Resets standard inputs, select needs manual setting

    modalTitle.textContent = `Edit Action A${action.an}`; // Set title for editing
    editNumHidden.value = action.an; // Store the action number being edited

    const targetIo = currentConfig.ioVariables.find(io => io.t === action.t && io.n === action.tn);
    const targetIoName = targetIo ? targetIo.nm : `IO ${action.tn}`;
    const targetIoTypeStr = dataTypesMap[action.t] || `Type ${action.t}`;

    targetIoTypeHidden.value = targetIoTypeStr;
    targetIoNumHidden.value = action.tn;
    targetDisplaySpan.textContent = `${targetIoTypeStr} #${action.tn}: ${targetIoName}`; // Set the display span
    operationSelect.innerHTML = '<option value="" disabled>-- Select Operation --</option>'; // Clear existing

    let availableActions = {}; // Determine available actions based on target type
    switch (action.t) { // Use action.t (target type)
        case 1: // DigitalOutput
            availableActions = { 0: actionTypeMap[0], 1: actionTypeMap[1], 5: actionTypeMap[5], 6: actionTypeMap[6] };
            break;
        case 3: // SoftIO
            availableActions = { 0: actionTypeMap[0], 1: actionTypeMap[1], 2: actionTypeMap[2], 3: actionTypeMap[3], 4: actionTypeMap[4], 5: actionTypeMap[5], 6: actionTypeMap[6] };
            break;
        case 4: // Timer
            availableActions = { 0: actionTypeMap[0], 1: actionTypeMap[1], 2: actionTypeMap[2], 6: actionTypeMap[6] };
            break;
        case 0: // DigitalInput
        case 2: // AnalogInput
            availableActions = { 5: actionTypeMap[5], 6: actionTypeMap[6] };
            break;
        default: // Fallback
            availableActions = { 5: actionTypeMap[5], 6: actionTypeMap[6] };
            break;
    }
    for (const [value, text] of Object.entries(availableActions)) {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = text;
        operationSelect.appendChild(optionElement);
    }
    operationSelect.value = action.a; // *** Select the action's current operation type ('a') ***
    valueInput.value = action.v; // Set the value from action.v
    if ([2, 3, 4].includes(action.a)) { // Actions requiring value: setValue(2), increment(3), decrement(4)
        valueGroup.style.display = 'block';
    } else {
        valueGroup.style.display = 'none';
    }
    deleteButton.style.display = 'block'; // *** Show the delete button ***
    saveButton.textContent = 'Update Action'; // Change save button text
}

function handleDeleteAction() {
    const modalElement = document.getElementById('createActionModal'); // <<< Action modal
    const editActNumInput = document.getElementById('actionEditNum');  // <<< Action edit num input
    const actNum = parseInt(editActNumInput.value, 10);

    if (isNaN(actNum) || actNum <= 0) {
        console.error("Invalid action number found for deletion:", editActNumInput.value);
        alert("Error: Cannot determine which action to delete.");
        return;
    }
    if (confirm(`Are you sure you want to delete Action A${actNum}? This will mark it inactive.`)) {
        const action = currentConfig.actions.find(a => a.an === actNum); // <<< Find by 'an'
        if (action) {
            action.s = false; // Mark as inactive by setting status 's' to false
            console.log(`Marked Action A${actNum} as inactive.`);
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            displayActions(); // <<< Refresh the action list
        } else {
            console.error(`Could not find Action A${actNum} to mark inactive.`);
            alert(`Error: Could not find Action A${actNum} to delete.`);
        }
    }
}

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
        0: operationModeMap[0], // 'None'
        4: operationModeMap[4], // 'Start Delay'
        7: operationModeMap[7]  // 'Auto Off'
    };

    for (const [value, text] of Object.entries(doModes)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modeSelect.appendChild(option);
    }
    modeSelect.value = ioVariable.m; // Set the current selection
}

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

function displayConditionGroups() {
    const listElement = document.getElementById('condition-groups-list');
    if (!listElement) {
        console.error("Condition Groups list element not found!");
        return;
    }

    listElement.innerHTML = ''; // Clear existing list items

    if (!currentConfig.conditionGroups || !Array.isArray(currentConfig.conditionGroups)) {
        console.warn("Condition Groups data is missing or not an array.");
        return;
    }

    currentConfig.conditionGroups.forEach(group => {
        if (group.s && group.ca && group.ca[0] !== 0) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item py-2 px-2 condition-group-item';
            listItem.dataset.groupNum = group.n;

            // Determine Logic Badge details
            const logicText = group.l === 0 ? 'All' : 'Any';
            const logicClass = group.l === 0 ? 'bg-success' : 'bg-warning text-dark';
            const logicTitle = group.l === 0 ? 'All conditions must be true' : 'Any condition can be true';

            // Generate a unique ID for the collapsible body
            const collapseId = `collapseConditionGroup${group.n}`;

            // --- NEW: Get first condition summary details ---
            let firstConditionSummaryHtml = '';
            const firstActiveConNum = group.ca.find(cn => cn > 0);

            if (firstActiveConNum) {
                const firstCondition = currentConfig.conditions.find(c => c.cn === firstActiveConNum && c.s);
                if (firstCondition) {
                    const targetIo = currentConfig.ioVariables.find(io => io.t === firstCondition.t && io.n === firstCondition.tn);
                    const targetIoName = targetIo ? (targetIo.nm || `IO ${firstCondition.tn}`) : `IO ${firstCondition.tn}`;
                    const badge1 = getConditionBadge1(firstCondition.cp);
                    const badge2 = getConditionBadge2(firstCondition.cp);
                    const badge3 = getConditionBadge3(firstCondition.cp, firstCondition.v);
                    const fullSummaryTitle = `First condition: C${firstCondition.cn} - ${targetIoName} ${badge1.text} ${badge2.text} ${badge3.text}`;

                    // Build the HTML for the first condition summary including badges
                    firstConditionSummaryHtml = `
                        <div class="flex-grow-1 me-2 d-flex flex-column gap-0 text-truncate" title="${fullSummaryTitle}">
                            <div class="condition-target-name small text-truncate">${targetIoName}</div>
                            <div class="condition-badges">
                                <span class="badge ${badge1.class}" title="${badge1.title}">${badge1.text}</span>
                                <span class="badge ${badge2.class}" title="${badge2.title}">${badge2.text}</span>
                                <span class="badge ${badge3.class}" title="${badge3.title}">${badge3.text}</span>
                            </div>
                        </div>
                    `;
                }
            }
            // --- End NEW ---


            // --- Build the Collapsed Header (Visible when collapsed) ---
            const collapsedHeaderHtml = `
                <div class="condition-group-header-collapsed d-flex justify-content-between align-items-center">
                    <!-- Group ID -->
                    <span class="condition-group-number fs-5 fw-bold me-2" title="Condition Group Number ${group.n}">CG${group.n}</span>

                    <!-- First Condition Summary (Middle) -->
                    ${firstConditionSummaryHtml}

                    <!-- Controls (Only Collapse/Expand Button) -->
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-secondary py-0 px-2 collapse-toggle-btn" type="button"
                                data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                                aria-expanded="false" aria-controls="${collapseId}" title="Toggle Members">
                            <span class="collapse-icon">▼</span>
                        </button>
                    </div>
                </div>
            `;

            // --- Build the Expanded Header (Visible when expanded) ---
            const expandedHeaderHtml = `
                <div class="condition-group-header-expanded d-flex justify-content-between align-items-center mb-0">
                    <!-- Group ID and Logic Badge -->
                    <div class="d-flex align-items-center flex-grow-1 me-2">
                        <span class="condition-group-number fs-5 fw-bold me-2" title="Condition Group Number ${group.n}">CG${group.n}</span>
                        <span class="badge ${logicClass} me-2" title="${logicTitle}">${logicText}</span>
                        <!-- No first condition summary here -->
                    </div>

                    <!-- Controls (Edit and Collapse/Expand Buttons) -->
                    <div class="d-flex align-items-center">
                        <!-- Edit Button -->
                        <button class="btn btn-sm btn-outline-secondary edit-group-btn fs-6 p-1 me-2" title="Edit Condition Group CG${group.n}"
                                data-group-type="Condition" data-group-num="${group.n}">
                            ⚙️
                        </button>
                        <!-- Collapse/Expand Button (Duplicate, will control the same collapse target) -->
                        <button class="btn btn-sm btn-outline-secondary py-0 px-2 collapse-toggle-btn" type="button"
                                data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                                aria-expanded="false" aria-controls="${collapseId}" title="Toggle Members">
                            <span class="collapse-icon">▼</span>
                        </button>
                    </div>
                </div>
            `;


            // --- Build the collapsible body ---
            let membersHtml = '';
            const activeMembers = group.ca.filter(conNum => conNum > 0);

            if (activeMembers.length > 0) {
                membersHtml = activeMembers.map(conNum => {
                    const condition = currentConfig.conditions.find(c => c.cn === conNum && c.s);
                    if (condition) {
                        const targetIo = currentConfig.ioVariables.find(io => io.t === condition.t && io.n === condition.tn);
                        const targetIoName = targetIo ? (targetIo.nm || `IO ${condition.tn}`) : `IO ${condition.tn}`;
                        const badge1 = getConditionBadge1(condition.cp);
                        const badge2 = getConditionBadge2(condition.cp);
                        const badge3 = getConditionBadge3(condition.cp, condition.v);

                        return `
                            <li class="list-group-item py-0 px-3 d-flex justify-content-between align-items-center condition-item">
                                <span class="condition-number fs-5 fw-bold me-1" title="Condition Number ${conNum}">C${conNum}</span>
                                <div class="flex-grow-1 me-1 d-flex flex-column gap-0">
                                    <div class="condition-target-name small text-truncate" title="Target: ${targetIoName}">${targetIoName}</div>
                                    <div class="condition-badges">
                                        <span class="badge ${badge1.class}" title="${badge1.title}">${badge1.text}</span>
                                        <span class="badge ${badge2.class}" title="${badge2.title}">${badge2.text}</span>
                                        <span class="badge ${badge3.class}" title="${badge3.title}">${badge3.text}</span>
                                    </div>
                                </div>
                            </li>
                        `;
                    } else {
                        return `<li class="list-group-item py-1 px-2 text-danger small">C${conNum} (Not Found/Inactive)</li>`;
                    }
                }).join('');
            } else {
                membersHtml = '<li class="list-group-item py-1 px-2 text-muted small">No members added yet.</li>';
            }

            const bodyHtml = `
                <div class="collapse" id="${collapseId}">
                    ${expandedHeaderHtml} <!-- Place the expanded header inside the collapsible body -->
                    <ul class="list-group list-group-flush mt-0">
                        ${membersHtml}
                    </ul>
                </div>
            `;

            // Combine collapsed header and the collapsible body
            listItem.innerHTML = collapsedHeaderHtml + bodyHtml;

            listElement.appendChild(listItem);
        }
    });

    // --- Attach event listeners ---
    attachConditionGroupListeners();
}

function attachConditionGroupListeners() {
    // Listeners for collapse/expand icons (handled by Bootstrap data-bs-toggle)
    // We just need to update the icon itself when the collapse event fires
    document.querySelectorAll('.condition-group-item .collapse-toggle-btn').forEach(button => {
        const collapseElement = document.getElementById(button.dataset.bsTarget.substring(1)); // Get the target collapse element
        if (collapseElement) {
            // Remove existing listeners to prevent duplicates
            collapseElement.removeEventListener('show.bs.collapse', handleCollapseShow);
            collapseElement.removeEventListener('hide.bs.collapse', handleCollapseHide);

            // Add new listeners
            // Listen to Bootstrap's collapse events
            // These events are more reliable for icon updates as they fire after Bootstrap's state change.
            collapseElement.addEventListener('show.bs.collapse', handleCollapseShow);
            collapseElement.addEventListener('hide.bs.collapse', handleCollapseHide);

            // Set initial icon state based on current collapse state (if page reloaded with state preserved)
            if (collapseElement.classList.contains('show')) {
                button.querySelector('.collapse-icon').textContent = '▼';
                button.setAttribute('aria-expanded', 'true');
            } else {
                button.querySelector('.collapse-icon').textContent = '▼';
                button.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Listeners for Edit buttons
    document.querySelectorAll('.condition-group-item .edit-group-btn').forEach(button => {
        // Remove existing listener to prevent duplicates
        button.removeEventListener('click', handleEditGroupClick); // Use a specific handler name
        // Add the listener
        button.addEventListener('click', handleEditGroupClick);
    });
}

function handleCollapseShow(event) {
    // When the collapse area is shown, change the button icon to '▼'
    // Also, hide the "collapsed" header and ensure the "expanded" header (inside the collapse target) is visible.
    const collapseTarget = event.target; // This is the div with class 'collapse'
    const listItem = collapseTarget.closest('.condition-group-item'); // Find the parent list item

    if (listItem) {
        const collapsedHeader = listItem.querySelector('.condition-group-header-collapsed');
        if (collapsedHeader) {
            collapsedHeader.classList.add('header-hidden'); // Hide the collapsed header
        }
        // Update icons on ALL buttons targeting this collapse element
        document.querySelectorAll(`[data-bs-target="#${collapseTarget.id}"]`).forEach(btn => {
            btn.querySelector('.collapse-icon').textContent = '▼';
            btn.setAttribute('aria-expanded', 'true');
        });
    }
}

function handleCollapseHide(event) {
    // When the collapse area is hidden, change the button icon to '▼'
    // Also, show the "collapsed" header. The "expanded" header will be hidden as it's inside the collapse target.
    const collapseTarget = event.target; // This is the div with class 'collapse'
    const listItem = collapseTarget.closest('.condition-group-item'); // Find the parent list item

    if (listItem) {
        const collapsedHeader = listItem.querySelector('.condition-group-header-collapsed');
        if (collapsedHeader) {
            collapsedHeader.classList.remove('header-hidden'); // Show the collapsed header
        }
        // Update icons on ALL buttons targeting this collapse element
        document.querySelectorAll(`[data-bs-target="#${collapseTarget.id}"]`).forEach(btn => {
            btn.querySelector('.collapse-icon').textContent = '▼';
            btn.setAttribute('aria-expanded', 'false');
        });
    }
}

function handleEditGroupClick(event) {
    const button = event.currentTarget;
    const groupType = button.dataset.groupType; // "Condition" or "Action"
    const groupNum = parseInt(button.dataset.groupNum, 10);

    if (groupType === "Condition") {
        // Find the condition group data from currentConfig
        const groupData = currentConfig.conditionGroups.find(cg => cg.n === groupNum && cg.s);

        if (groupData) {
            console.log(`Editing Condition Group CG${groupNum} with data:`, groupData);
            showConditionGroupEditor(groupData); // Pass the found group data
        } else {
            console.error(`Could not find active Condition Group CG${groupNum} to edit.`);
            alert(`Error: Condition Group CG${groupNum} not found or is inactive.`);
        }
    } else if (groupType === "Action") {
        // Placeholder for Action Group editing
        console.log(`Edit button clicked for Action Group AG${groupNum}`);
        alert(`Editing Action Group AG${groupNum} - Editor coming soon!`);
    } else {
        console.warn(`Edit button clicked for unknown group type: ${groupType}`);
    }
}

function handleCreateConditionGroupClick() {
    console.log("Create Condition Group button clicked.");
    showConditionGroupEditor(); // Call the function to show the editor in "new" mode
}

function showConditionGroupEditor(groupData = null) {
    const editorDiv = document.getElementById('condition-group-editor');
    const listDiv = document.getElementById('condition-groups-list'); // The list of groups
    // const editorTitle = document.getElementById('condition-editor-title'); // No longer used directly
    // const logicToggle = document.getElementById('conditionGroupLogicToggle'); // REMOVED
    const logicButton = document.getElementById('conditionGroupLogicButton'); // Get the dropdown button
    const logicValueInput = document.getElementById('conditionGroupLogicValue'); // Get the hidden input
    const membersListUL = document.getElementById('editable-condition-group-members');
    const deleteButton = document.getElementById('deleteConditionGroupBtn');

    if (!editorDiv || !listDiv || !logicButton || !logicValueInput || !membersListUL || !deleteButton) { // UPDATED CHECK
        console.error("Missing editor elements for showConditionGroupEditor!");
        return;
    }

    // Hide the list and show the editor
    listDiv.style.display = 'none';
    editorDiv.style.display = 'block';

    // Clear previous members from the editor list
    membersListUL.innerHTML = '';

    if (groupData) {
        // --- Populate for Editing Existing Group ---
        console.log(`Populating editor for Condition Group CG${groupData.n}`);
        currentEditingConditionGroupNum = groupData.n; // Store the group number being edited
        // Set the logic dropdown button text and hidden input value
        const logicText = groupData.l === 1 ? 'Any' : 'All'; // Determine text based on saved logic
        logicButton.textContent = logicText;
        logicValueInput.value = groupData.l; // Set the hidden input value (0 or 1)
        deleteButton.style.display = 'inline-block';

        const activeMembersInGroup = groupData.ca.filter(conNum => conNum > 0);

        if (activeMembersInGroup.length > 0) {
            activeMembersInGroup.forEach(conNum => {
                const condition = currentConfig.conditions.find(c => c.cn === conNum && c.s); // Find active condition
                if (condition) {
                    addConditionToEditorList(condition); // This function adds to UL and attaches listeners
                } else {
                    // Condition from group.conditionArray not found or is inactive
                    const memberLi = document.createElement('li');
                    memberLi.className = 'list-group-item py-1 px-2 d-flex align-items-center small text-danger';
                    memberLi.textContent = `C${conNum} (Not Found/Inactive)`;
                    membersListUL.appendChild(memberLi);
                }
            });
        } else {
            // No active members in this group, add placeholder
            const placeholder = document.createElement('li');
            placeholder.className = 'list-group-item py-1 px-2 text-muted text-center small';
            placeholder.textContent = 'Drag individual Conditions here';
            membersListUL.appendChild(placeholder);
        }
        // Listeners for remove buttons are handled by addConditionToEditorList

    } else {
        // --- Populate for Creating New Group ---
        console.log("Populating editor for New Condition Group");
        currentEditingConditionGroupNum = 0;
        // Default to AND logic (0) for new groups
        logicButton.textContent = 'All (AND)';
        logicValueInput.value = '0';
        deleteButton.style.display = 'none';

        const placeholder = document.createElement('li');
        placeholder.className = 'list-group-item py-1 px-2 text-muted text-center small';
        placeholder.textContent = 'Drag individual Conditions here';
        membersListUL.appendChild(placeholder);
    }
    // Ensure listeners are attached if items were added not via addConditionToEditorList
    // However, addConditionToEditorList already calls attachConditionGroupEditorMemberListeners.
    // If the list is populated with placeholders (which don't have remove buttons),
    // this call is not strictly necessary for them.
    // For simplicity and robustness, ensuring it's called once after any potential modification
    // to membersListUL can be good, but let's rely on addConditionToEditorList for now.
    // If we add items to membersListUL directly without addConditionToEditorList, then we'd need it here.
    // attachConditionGroupEditorMemberListeners(); // Potentially redundant if all items go through addConditionToEditorList
}

function hideConditionGroupEditor() {
    const editorDiv = document.getElementById('condition-group-editor');
    const listDiv = document.getElementById('condition-groups-list');
    const membersListUL = document.getElementById('editable-condition-group-members');

    if (!editorDiv || !listDiv || !membersListUL) {
        console.error("Missing editor elements for hiding!");
        return;
    }

    // Hide the editor and show the list
    editorDiv.style.display = 'none';
    listDiv.style.display = 'block';

    // Reset editor state
    membersListUL.innerHTML = ''; // Clear members list
    currentEditingConditionGroupNum = 0; // Reset editing state
    // Optionally reset title and logic toggle if needed, but they'll be set on next show
}

function addConditionToEditorList(condition) {
    const membersListUL = document.getElementById('editable-condition-group-members');
    if (!membersListUL) {
        console.error("Editor members list UL ('editable-condition-group-members') not found.");
        return null;
    }

    // Check if this condition is already in the editor's list to prevent duplicates
    const existingMember = membersListUL.querySelector(`li[data-con-num="${condition.cn}"]`);
    if (existingMember) {
        console.log(`Condition C${condition.cn} is already in the group editor.`);
        // Optionally provide feedback to the user, e.g., highlight the existing item
        existingMember.classList.add('bg-warning-subtle'); // Bootstrap 5 subtle warning
        setTimeout(() => existingMember.classList.remove('bg-warning-subtle'), 1500);
        return null; // Indicate it was already there or couldn't be added
    }

    // Create the list item (similar to displayConditions but with remove button)
    const memberLi = document.createElement('li');
    memberLi.className = 'list-group-item py-1 px-2 d-flex justify-content-between align-items-center small condition-group-editor-member';
    memberLi.dataset.conNum = condition.cn; // Store conNum for saving, reordering, and removal

    // Find target IO and get badge details (reusing existing logic from displayConditions)
    const targetIo = currentConfig.ioVariables.find(io => io.t === condition.t && io.n === condition.tn);
    const targetIoName = targetIo ? targetIo.nm : `IO ${condition.tn}`;
    const targetIoTypeStr = dataTypesMap[condition.t] || `Type ${condition.t}`;
    const targetIoTooltip = targetIo ? `${targetIoTypeStr} #${condition.tn}: ${targetIo.nm}` : `Unknown IO (Type ${condition.t}, Num ${condition.tn})`;

    const badge1 = getConditionBadge1(condition.cp);
    const badge2 = getConditionBadge2(condition.cp);
    const badge3 = getConditionBadge3(condition.cp, condition.v);

    memberLi.innerHTML = `
    <!-- Move the condition number outside the flex-grow-1 div -->
    <span class="condition-number fs-5 fw-bold me-2" title="Condition Number ${condition.cn}">C${condition.cn}</span>

    <!-- The flex-grow-1 div now only contains the name and badges -->
    <div class="flex-grow-1 me-2 d-flex flex-column gap-0">
        <div class="condition-target-name small text-truncate" title="Target: ${targetIoTooltip}">${targetIoName}</div>
        <div class="condition-badges">
            <span class="badge ${badge1.class}" title="${badge1.title}">${badge1.text}</span>
            <span class="badge ${badge2.class}" title="${badge2.title}">${badge2.text}</span>
            <span class="badge ${badge3.class}" title="${badge3.title}">${badge3.text}</span>
        </div>
    </div>

    <button class="btn btn-sm btn-outline-danger py-0 px-1 delete-member-btn" title="Remove C${condition.cn} from group">
        &times;
    </button>
`;

    // If it's the first item, clear any placeholder text (like "Drag individual Conditions here")
    const placeholder = membersListUL.querySelector('.text-muted.text-center');
    if (placeholder) {
        placeholder.remove();
    }

    membersListUL.appendChild(memberLi);
    console.log(`Added Condition C${condition.cn} to the group editor list.`);

    // Attach listener to the new remove button (and any existing ones)
    attachConditionGroupEditorMemberListeners();

    return memberLi; // Return the added element, might be useful
}

function attachConditionGroupEditorMemberListeners() {
    const membersListUL = document.getElementById('editable-condition-group-members');
    if (!membersListUL) return;

    membersListUL.querySelectorAll('.delete-member-btn').forEach(button => {
        // Remove existing listener to prevent duplicates if this function is called multiple times
        button.removeEventListener('click', handleRemoveConditionGroupMember);
        // Add the listener
        button.addEventListener('click', handleRemoveConditionGroupMember);
    });
}

function handleRemoveConditionGroupMember(event) {
    const button = event.currentTarget;
    const listItem = button.closest('li.condition-group-editor-member'); // Get the parent list item

    if (listItem) {
        const conNum = parseInt(listItem.dataset.conNum, 10);
        console.log(`Removing Condition C${conNum} from editor list.`);
        listItem.remove(); // Remove the list item from the DOM

        // Optional: If the list becomes empty, add the placeholder back
        const membersListUL = document.getElementById('editable-condition-group-members');
        if (membersListUL && membersListUL.children.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.className = 'list-group-item py-1 px-2 text-muted text-center small';
            placeholder.textContent = 'Drag individual Conditions here';
            membersListUL.appendChild(placeholder);
        }
    } else {
        console.warn("Could not find list item to remove for button:", button);
    }
}

function handleSaveConditionGroup() {
    console.log("Save Condition Group button clicked.");

    // const logicToggle = document.getElementById('conditionGroupLogicToggle'); // REMOVED
    const logicValueInput = document.getElementById('conditionGroupLogicValue'); // Get the hidden input
    const membersListUL = document.getElementById('editable-condition-group-members');

    if (!logicValueInput || !membersListUL) { // Check for the hidden input
        console.error("Missing elements for saving condition group!");
        alert("Error: Could not save condition group. Editor elements missing.");
        return;
    }

    // 1. Get the logic (0 for AND, 1 for OR)
    const groupLogic = parseInt(logicValueInput.value, 10); // Read the value from the hidden input

    // 2. Get the member condition numbers
    const memberConditionNumbers = [];
    membersListUL.querySelectorAll('li.condition-group-editor-member').forEach(li => {
        if (li.dataset.conNum) { // Ensure it's a member item, not a placeholder
            memberConditionNumbers.push(parseInt(li.dataset.conNum, 10));
        }
    });

    if (memberConditionNumbers.length === 0) {
        alert("Cannot save an empty condition group. Please add at least one condition or cancel.");
        return;
    }
    if (memberConditionNumbers.length > 10) { // MAX_CONDITIONS_PER_GROUP is 10
        alert(`Cannot save group with more than 10 conditions. You have ${memberConditionNumbers.length}.`);
        return;
    }

    // Prepare the conditionArray for the C++ struct (pad with 0s)
    const finalConditionArray = new Array(10).fill(0); // MAX_CONDITIONS_PER_GROUP
    for (let i = 0; i < memberConditionNumbers.length; i++) {
        finalConditionArray[i] = memberConditionNumbers[i];
    }

    let groupToUpdate = null;

    if (currentEditingConditionGroupNum > 0) {
        // --- Editing an existing group ---
        groupToUpdate = currentConfig.conditionGroups.find(cg => cg.n === currentEditingConditionGroupNum);
        if (!groupToUpdate) {
            console.error(`Could not find Condition Group CG${currentEditingConditionGroupNum} to update.`);
            alert(`Error: Condition Group CG${currentEditingConditionGroupNum} not found for saving.`);
            return;
        }
        console.log(`Updating existing Condition Group CG${currentEditingConditionGroupNum}`);
    } else {
        // --- Creating a new group ---
        // Find the first inactive group slot
        let newGroupIndex = -1;
        for (let i = 0; i < currentConfig.conditionGroups.length; i++) {
            if (!currentConfig.conditionGroups[i].s) { // 's' is status
                newGroupIndex = i;
                break;
            }
        }

        if (newGroupIndex === -1) {
            alert("Error: Maximum number of Condition Groups reached. Cannot create a new one.");
            // TODO: Consider if MAX_CONDITION_GROUPS should be dynamically handled or if this is a hard limit.
            return;
        }
        groupToUpdate = currentConfig.conditionGroups[newGroupIndex];
        currentEditingConditionGroupNum = groupToUpdate.n; // Set for console log and consistency
        console.log(`Creating new Condition Group in slot CG${groupToUpdate.n}`);
    }

    // Update the group object in currentConfig
    groupToUpdate.l = groupLogic; // 'l' for Logic
    // Copy elements to ensure fixed size is respected, matching the 'ca' key from JSON.
    for (let i = 0; i < 10; i++) { // MAX_CONDITIONS_PER_GROUP
        groupToUpdate.ca[i] = finalConditionArray[i]; // Use .ca for the JavaScript object
    }
    groupToUpdate.s = true; // Set status to active

    console.log(`Saved Condition Group CG${groupToUpdate.n}:`, groupToUpdate);

    // Hide the editor
    hideConditionGroupEditor();

    // Refresh the display of condition groups
    displayConditionGroups();

    // Reset currentEditingConditionGroupNum (already done in hideConditionGroupEditor)
}

function handleDeleteConditionGroup() {
    if (currentEditingConditionGroupNum <= 0) {
        console.error("No condition group is currently being edited. Cannot delete.");
        alert("Error: No group selected for deletion.");
        return;
    }

    if (confirm(`Are you sure you want to delete Condition Group CG${currentEditingConditionGroupNum}? This will mark it inactive.`)) {
        const groupToDelete = currentConfig.conditionGroups.find(cg => cg.n === currentEditingConditionGroupNum);

        if (groupToDelete) {
            // Mark as inactive
            groupToDelete.s = false;
            // Optionally, clear its members array to free up condition references if needed,
            // though just marking inactive is usually sufficient for filtering.
            // For completeness and to match default state of inactive groups:
            for (let i = 0; i < groupToDelete.ca.length; i++) {
                groupToDelete.ca[i] = 0;
            }
            groupToDelete.l = 0; // Reset logic to default (AND)

            console.log(`Marked Condition Group CG${currentEditingConditionGroupNum} as inactive.`);

            hideConditionGroupEditor(); // Hide the editor
            displayConditionGroups();   // Refresh the list
        } else {
            console.error(`Could not find Condition Group CG${currentEditingConditionGroupNum} to delete.`);
            alert(`Error: Could not find Condition Group CG${currentEditingConditionGroupNum}.`);
        }
    }
}

function displayActionGroups() {
    const listElement = document.getElementById('action-groups-list');
    if (!listElement) {
        console.error("Action Groups list element not found!");
        return;
    }
    listElement.innerHTML = '<li class="list-group-item text-muted small">Action Groups display coming soon.</li>'; // Placeholder content

    if (!currentConfig.actionGroups || !Array.isArray(currentConfig.actionGroups)) {
        console.warn("Action Groups data is missing or not an array.");
        return;
    }
    // TODO: Implement full display logic for action groups later
    console.log("displayActionGroups function called - placeholder.");
}

function setConditionGroupLogic(value, text) {
    const logicButton = document.getElementById('conditionGroupLogicButton');
    const logicValueInput = document.getElementById('conditionGroupLogicValue');
    if (logicButton && logicValueInput) {
        logicButton.textContent = text; // Update the button text
        logicValueInput.value = value; // Update the hidden input value
        console.log(`Condition Group Logic set to: ${text} (Value: ${value})`);
    }
}


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

    const conditionComparisonSelect = document.getElementById('conditionComparison');
    const conditionValueGroup = document.getElementById('conditionValueGroup');
    if (conditionComparisonSelect && conditionValueGroup) {
        conditionComparisonSelect.addEventListener('change', function () {
            const selectedComparison = parseInt(this.value, 10);
            if ([2, 3, 4].includes(selectedComparison)) {
                conditionValueGroup.style.display = 'block'; // Show the value input
            } else {
                conditionValueGroup.style.display = 'none'; // Hide the value input
            }
        });
    }
    const saveConditionButton = document.getElementById('saveConditionBtn');
    if (saveConditionButton) {
        saveConditionButton.addEventListener('click', saveCondition); // Attach the saveCondition function
    }

    const actionOperationSelect = document.getElementById('actionOperation');
    const actionValueGroup = document.getElementById('actionValueGroup');
    if (actionOperationSelect && actionValueGroup) {
        actionOperationSelect.addEventListener('change', function () {
            const selectedActionType = parseInt(this.value, 10);
            if ([2, 3, 4].includes(selectedActionType)) {
                actionValueGroup.style.display = 'block'; // Show the value input
            } else {
                actionValueGroup.style.display = 'none'; // Hide the value input
            }
        });
    }
    const saveActionButton = document.getElementById('saveActionBtn');
    if (saveActionButton) {
        saveActionButton.addEventListener('click', saveAction); // Attach the saveAction function
    }
    const deleteActionButton = document.getElementById('deleteActionBtn');
    if (deleteActionButton) {
        deleteActionButton.addEventListener('click', handleDeleteAction); // Attach the delete handler
    }
    const createConditionGroupBtn = document.getElementById('createConditionGroupBtn');
    if (createConditionGroupBtn) {
        createConditionGroupBtn.addEventListener('click', handleCreateConditionGroupClick);
    }
    const cancelConditionGroupEditBtn = document.getElementById('cancelConditionGroupEditBtn');
    if (cancelConditionGroupEditBtn) {
        cancelConditionGroupEditBtn.addEventListener('click', hideConditionGroupEditor);
    }

    // --- NEW: Attach listener for the Save button in the Condition Group editor ---
    const saveConditionGroupBtn = document.getElementById('saveConditionGroupBtn');
    if (saveConditionGroupBtn) {
        saveConditionGroupBtn.addEventListener('click', handleSaveConditionGroup);
    }
    // --- NEW: Attach listener for the Delete button in the Condition Group editor ---
    const deleteConditionGroupBtn = document.getElementById('deleteConditionGroupBtn');
    if (deleteConditionGroupBtn) {
        deleteConditionGroupBtn.addEventListener('click', handleDeleteConditionGroup);
    }
});
