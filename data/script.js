// Global variable to hold the entire configuration fetched from the ESP32
let currentConfig = {};

let ioVariableSortable = null; // To hold the Sortable instance

// --- Enum Maps (for display/lookup) ---
// Should match enums in dataStructure.h
const dataTypesMap = {
    0: 'DigitalInput', 1: 'DigitalOutput', 2: 'AnalogInput', 3: 'SoftIO', 4: 'Timer'
};
const operationModeMap = {
    0: 'None', 1: 'Rising', 2: 'Falling', 3: 'StateChange', 4: 'Pulse', 5: 'OneShot', 6: 'Repeating', 7: 'Countdown'
};
const operationModeShortMap = {
    0: 'None', 1: 'Rise', 2: 'Fall', 3: 'StCn', 4: 'Puls', 5: 'Once', 6: 'Rept', 7: 'Cntd'
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
    // Add other list elements later (doList, aiList, etc.)

    if (!diList) {
        console.error("Element with ID 'digital-inputs-list' not found!");
        return; // Exit if the list element doesn't exist
    }

    // Clear existing items before adding new ones
    diList.innerHTML = '';
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
                <span class="io-number fs-5 fw-bold me-2">${io.n}</span>

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
        // Add 'else if' blocks here later for other IO types (DigitalOutput, AnalogInput, etc.)
        // else if (io.t === 1) { /* Handle Digital Outputs */ }
        // else if (io.t === 2) { /* Handle Analog Inputs */ }
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
    const button = event.currentTarget; // Get the button that was clicked
    const typeStr = button.dataset.type; // Get "DigitalInput" from data-type attribute
    const num = parseInt(button.dataset.num, 10); // Get the number (e.g., 1) from data-num attribute

    // Find the specific IOVariable object in our global currentConfig array
    const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === typeStr && io.n === num);

    if (ioVariable) {
        // Get the modal element
        const modal = document.getElementById('editIoVariableModal');

        // --- Populate the modal's form fields ---
        // Set modal title
        modal.querySelector('#editIoVariableModalLabel').textContent = `Edit ${typeStr} #${num}`;

        // Store identifiers in hidden fields for later saving
        modal.querySelector('#editIoType').value = typeStr;
        modal.querySelector('#editIoNum').value = num;

        // Display the (disabled) Input Number
        modal.querySelector('#editIoDiNum').value = num;

        // Populate the editable fields
        modal.querySelector('#editIoName').value = ioVariable.nm; // Set the name input
        modal.querySelector('#editIoMode').value = ioVariable.m; // Set the mode dropdown selection
        modal.querySelector('#editIoStatus').checked = ioVariable.s; // Set the enable/disable switch state

        // Note: The modal is shown automatically because the button has data-bs-toggle="modal"
    } else {
        // This shouldn't happen if data attributes are correct, but good to have a check
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
    const conditionsDropZone = document.getElementById('conditions-drop-zone');
    // Get other lists/zones later as needed

    if (!diList || !conditionsDropZone) {
        console.error("Could not find necessary elements for drag and drop initialization.");
        return;
    }

    // --- Initialize Sortable for the IO Variables List (Source) ---
    // Allows items to be dragged FROM this list
    new Sortable(diList, {
        group: {
            name: 'io-logic', // Shared group name
            pull: 'clone',    // Clone the item when dragging out
            put: false        // Do not allow dropping items INTO this list from others
        },
        animation: 150,
        sort: false // Disable sorting within the IO Variables list itself
    });

    // --- Initialize Sortable for the Conditions Drop Zone (Target) ---
    // Allows items to be dropped INTO this zone
    new Sortable(conditionsDropZone, {
        group: {
            name: 'io-logic', // Shared group name
            pull: false,      // Do not allow dragging items OUT of this zone (it's just a drop target)
            put: true         // Allow items from the 'io-logic' group to be dropped here
        },
        animation: 150,
        sort: false, // Disable sorting within the drop zone itself
        onAdd: function (evt) {
            // This function runs when an item is dropped INTO this zone
            const itemEl = evt.item; // The dragged element (the clone)
            const originalList = evt.from; // The list the item came from (e.g., diList)

            // Extract data from the dropped item
            const ioType = itemEl.dataset.type;
            const ioNum = itemEl.dataset.num;

            console.log(`Dropped IO Variable: Type=${ioType}, Num=${ioNum} onto Conditions zone.`);

            // --- IMPORTANT: Remove the visual clone from the drop zone ---
            // We don't want the IO Variable item to *stay* here visually.
            // The drop is just the trigger to start creating a condition.
            itemEl.remove();

            // --- Find the IO Variable object ---
            const ioVariable = currentConfig.ioVariables.find(io => dataTypesMap[io.t] === ioType && io.n === parseInt(ioNum, 10));

            if (ioVariable) {
                // --- Populate and show the modal ---
                populateConditionModal(ioVariable); // Call the new helper function
            } else {
                console.error(`Could not find IOVariable data for: ${ioType} #${ioNum} after drop.`);
                alert("Error: Could not find the dropped IO Variable's data.");
            }


        }
    });

    // Add initialization for other lists/zones later (e.g., actions drop zone, groups)
    console.log("Drag and drop initialized for Digital Inputs -> Conditions Drop Zone.");
}

// Function to populate and show the Create Condition modal
function populateConditionModal(ioVariable) {
    const modalElement = document.getElementById('createConditionModal');
    if (!modalElement) {
        console.error("Create Condition Modal element not found!");
        return;
    }
    const modal = new bootstrap.Modal(modalElement); // Get Bootstrap modal instance

    // --- Reset form elements ---
    const form = document.getElementById('create-condition-form');
    form.reset(); // Reset standard form inputs
    document.getElementById('conditionEditNum').value = '0'; // Explicitly set to 0 for new condition
    document.getElementById('conditionValueGroup').style.display = 'none'; // Hide value input initially

    // --- Populate hidden fields and display ---
    document.getElementById('conditionTargetIoType').value = dataTypesMap[ioVariable.t];
    document.getElementById('conditionTargetIoNum').value = ioVariable.n;
    document.getElementById('conditionTargetDisplay').value = `${dataTypesMap[ioVariable.t]} #${ioVariable.n}: ${ioVariable.nm}`;

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


// Function to handle saving the new condition from the modal
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

    // --- Find the first available (inactive) condition slot ---
    let conditionIndex = -1;
    for (let i = 0; i < currentConfig.conditions.length; i++) {
        if (!currentConfig.conditions[i].s) { // Find first where status (s) is false
            conditionIndex = i;
            break;
        }
    }

    if (conditionIndex === -1) {
        alert("Error: Maximum number of conditions reached.");
        // TODO: Potentially increase MAX_CONDITIONS if needed, or provide better feedback
        return;
    }

    // --- Update the condition object in currentConfig ---
    const conditionToUpdate = currentConfig.conditions[conditionIndex];
    conditionToUpdate.t = parseInt(targetIoTypeNum, 10); // Numeric type
    conditionToUpdate.tn = targetIoNum;
    conditionToUpdate.cp = parseInt(comparisonValue, 10); // Numeric comparison enum
    conditionToUpdate.v = conditionValue;
    conditionToUpdate.s = true; // Set status to active

    console.log(`Saved new condition at index ${conditionIndex}:`, conditionToUpdate);

    // --- Close the modal ---
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }

    // --- Refresh the conditions list display (we'll create this next) ---
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
                <button class="btn btn-sm btn-outline-danger delete-condition-btn fs-6 p-1" title="Delete Condition ${cond.cn}">
                    🗑️
                </button>
            `;

            // Add the fully constructed list item to the list

            listElement.appendChild(listItem);
        }
    });

    // --- Attach listeners to the newly created delete buttons ---
    attachDeleteConditionListeners(); // Make sure this function exists and works
}

// Ensure these helper functions for delete exist (from previous step or add them now)
function attachDeleteConditionListeners() {
    document.querySelectorAll('.delete-condition-btn').forEach(button => {
        // Remove existing listener first to prevent duplicates if function is called multiple times
        button.removeEventListener('click', handleDeleteConditionClick);
        button.addEventListener('click', handleDeleteConditionClick);
    });
}

function handleDeleteConditionClick(event) {
    const button = event.currentTarget;
    const listItem = button.closest('.condition-item');
    const conNum = parseInt(listItem.dataset.conNum, 10);

    if (confirm(`Are you sure you want to delete Condition C${conNum}? This will mark it inactive.`)) {
        // Find the condition in the config
        const condition = currentConfig.conditions.find(c => c.cn === conNum);
        if (condition) {
            condition.s = false; // Mark as inactive
            // IMPORTANT TODO: Also need to remove this condition's conNum from any conditionGroups that use it.
            // This requires iterating through currentConfig.conditionGroups and modifying their 'ca' arrays.
            // We will handle this logic later when implementing group editing.
            console.log(`Marked Condition C${conNum} as inactive.`);
            displayConditions(); // Refresh the list
            // Note: Changes are only in memory until "Save Configuration" is clicked.
        } else {
            console.error(`Could not find Condition C${conNum} to mark inactive.`);
        }
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadConfig(); // Load config when the page is ready

    const saveButton = document.getElementById('saveConfigBtn');
    if (saveButton) {
        saveButton.addEventListener('click', saveConfig);
    }
    const saveIoBtn = document.getElementById('saveIoChangesBtn');
    if (saveIoBtn) {
        saveIoBtn.addEventListener('click', saveIoVariableChanges);
    }
    // --- Listener for the Condition Comparison dropdown ---
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

    // --- Listener for the Save Condition button in the modal ---
    const saveConditionButton = document.getElementById('saveConditionBtn');
    if (saveConditionButton) {
        saveConditionButton.addEventListener('click', saveCondition);
    } else {
        console.error("Could not find Save Condition button element.");
    }


});
