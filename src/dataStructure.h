#ifndef DATA_STRUCTURE_H
#define DATA_STRUCTURE_H

#include <Arduino.h>
#include <ArduinoJson.h>  // Include ArduinoJson for types used in function signatures

// Define maximum number of variables and logic elements
#define MAX_DIGITAL_IN 6
#define MAX_DIGITAL_OUT 4
#define MAX_ANALOG_IN 4
#define MAX_SOFTIO 20
#define MAX_TIMERS 10
#define MAX_CONDITIONS 50
#define MAX_CONDITION_GROUPS 20
#define MAX_ACTIONS 50
#define MAX_ACTION_GROUPS 20
#define MAX_RULES 20
#define MAX_CONDITIONS_PER_GROUP 10
#define MAX_ACTIONS_PER_GROUP 10

// --- Enums ---
// Defines the different types of I/O or internal variables
enum dataTypes { DigitalInput, DigitalOutput, AnalogInput, SoftIO, Timer };

// Defines operational modes, primarily for Digital Inputs and Timers
enum operationMode {
  none,         // No specific mode / Not applicable
  rising,       // Trigger on rising edge (DigitalInput)
  falling,      // Trigger on falling edge (DigitalInput)
  stateChange,  // Trigger on any state change (DigitalInput)
  pulse,        // Generate a pulse (DigitalOutput - potentially future use)
  oneShot,      // Timer runs once (Timer)
  repeating,    // Timer restarts automatically (Timer)
  scaled,       // Analog Input will be scaled to 0-100 range
  persistent,   // SoftIO's value will be persistent accross reboot
};

// Defines comparison types used in Conditions
enum comparisons {
  isTrue,      // Check if boolean state/flag is true
  isFalse,     // Check if boolean state/flag is false
  isEqual,     // Check if value is equal to condition's value
  isLess,      // Check if value is less than condition's value
  isGreater,   // Check if value is greater than condition's value
  flagIsTrue,  // Check specifically if the IOVariable's flag is true
  flagIsFalse  // Check specifically if the IOVariable's flag is false
};

// Defines action types performed by Actions
enum actionType {
  set,        // Set boolean state/flag to true (DigitalOutput, SoftIO, Timer
              // Start/Enable)
  reset,      // Set boolean state/flag to false (DigitalOutput, SoftIO, Timer
              // Stop/Disable)
  setValue,   // Set numerical value (SoftIO, Timer Preset)
  increment,  // Increment numerical value (SoftIO)
  decrement,  // Decrement numerical value (SoftIO)
  setFlag,    // Set the IOVariable's flag (Any type)
  clear       // Clear the IOVariable's flag (Any type) / Reset Timer
};

// Defines how conditions within a Condition Group are combined
enum combineLogic {
  andLogic,  // All conditions must be true
  orLogic    // Any condition can be true
};
// --- End Enums ---

// --- Struct Definitions ---
// Represents a single I/O point or internal variable
struct IOVariable {
  uint8_t num;         // Unique number within its type (e.g., Digital Input 1)
  dataTypes type;      // Type of the variable (DigitalInput, SoftIO, etc.)
  uint8_t gpio;        // Associated GPIO pin (if applicable, 0 otherwise)
  operationMode mode;  // Operational mode (e.g., rising, oneShot)
  char name[30];       // User-defined name
  // Runtime state variables:
  bool state;     // Current boolean state (e.g., HIGH/LOW, Timer Running)
  int32_t value;  // Current numerical value (e.g., Analog Reading, Timer Count,
                  // SoftIO Value)
  bool flag;      // General purpose boolean flag associated with this variable
  // Configuration status:
  bool status;  // Is this variable definition active/enabled?
};

// Represents a single condition to be evaluated
struct condition {
  uint8_t conNum;     // Unique ID for this condition
  dataTypes Type;     // Type of the target IOVariable to check
  uint8_t targetNum;  // 'num' of the target IOVariable to check
  comparisons comp;   // Comparison operation to perform
  int32_t value;      // Value to compare against (if applicable)
  bool status;        // Is this condition definition active/enabled?
};

// Represents a single action to be performed
struct action {
  uint8_t actNum;     // Unique ID for this action
  dataTypes Type;     // Type of the target IOVariable to affect
  uint8_t targetNum;  // 'num' of the target IOVariable to affect
  actionType action;  // Action to perform (e.g., set, setValue)
  int32_t value;      // Value to use in the action (if applicable)
  bool status;        // Is this action definition active/enabled?
};

// Groups multiple conditions together with a combining logic
struct conditionGroup {
  uint8_t num;                                       // Unique ID for this group
  uint8_t conditionArray[MAX_CONDITIONS_PER_GROUP];  // Array of 'conNum's
  // Configuration:
  combineLogic Logic;  // Logic used to combine results (AND/OR)
  bool status;         // Is this group definition active/enabled?
};

// Groups multiple actions together to be executed sequentially
struct actionGroup {
  uint8_t num;                                 // Unique ID for this group
  uint8_t actionArray[MAX_ACTIONS_PER_GROUP];  // Array of 'actNum's
  bool status;  // Is this group definition active/enabled?
};

// Represents a rule linking a Condition Group to an Action Group
struct rule {
  uint8_t num;             // Unique ID for this rule
  uint8_t conditionGroup;  // 'num' of the Condition Group to evaluate
  uint8_t actionGroup;     // 'num' of the Action Group to execute
  bool status;             // Is this rule definition active/enabled?
};
// --- End Struct Definitions ---

// --- Extern Declarations for Global Data Arrays ---
// These arrays hold the actual configuration and runtime state data.
// They are defined in dataStructure.cpp.

extern IOVariable IOVariables[MAX_DIGITAL_IN + MAX_DIGITAL_OUT + MAX_ANALOG_IN +
                              MAX_SOFTIO + MAX_TIMERS];
extern condition conditions[MAX_CONDITIONS];
extern conditionGroup conditionGroups[MAX_CONDITION_GROUPS];
extern action actions[MAX_ACTIONS];
extern actionGroup actionGroups[MAX_ACTION_GROUPS];
extern rule rules[MAX_RULES];
extern uint8_t ruleSequence[MAX_RULES];  // Defines the order in which active
                                         // rules are evaluated
// --- End Extern Declarations ---

void CreateDefaultIOVariables();
void InitializeDefaultLogicComponents();

#endif  // DATA_STRUCTURE_H
