#include "dataStructure.h"

#include <ArduinoJson.h>  // Include ArduinoJson
#include <LittleFS.h>     // Include LittleFS

// === Define Global Arrays (matching extern declarations in .h) ===
IOVariable ioVariables[MAX_DIGITAL_IN + MAX_DIGITAL_OUT + MAX_ANALOG_IN +
                       MAX_SOFTIO + MAX_TIMERS];
condition conditions[MAX_CONDITIONS];
conditionGroup conditionGroups[MAX_CONDITION_GROUPS];
action actions[MAX_ACTIONS];
actionGroup actionGroups[MAX_ACTION_GROUPS];
rule rules[MAX_RULES];
uint8_t ruleSequence[MAX_RULES];
// ==============================================================

// Create a default Map for initial population if config doesn't exist
IOVariable defaultIOVariables[] = {
    {1, DigitalInput, 4, none, "Digital Input 1", false, 0, false, false},
    {2, DigitalInput, 2, none, "Digital Input 2", false, 0, false, false},
    {3, DigitalInput, 15, none, "Digital Input 3", false, 0, false, false},
    {4, DigitalInput, 13, none, "Digital Input 4", false, 0, false, false},
    {5, DigitalInput, 12, none, "Digital Input 5", false, 0, false, false},
    {6, DigitalInput, 14, none, "Digital Input 6", false, 0, false, false},
    {1, DigitalOutput, 27, none, "Digital Outpot 1", false, 0, false, false},
    {2, DigitalOutput, 26, none, "Digital Outpot 2", false, 0, false, false},
    {3, DigitalOutput, 25, none, "Digital Outpot 3", false, 0, false, false},
    {4, DigitalOutput, 33, none, "Digital Outpot 4", false, 0, false, false},
    {1, AnalogInput, 35, none, "Analog Input 1", false, 0, false, false},
    {2, AnalogInput, 34, none, "Analog Input 2", false, 0, false, false},
    {3, AnalogInput, 39, none, "Analog Input 3", false, 0, false, false},
    {4, AnalogInput, 36, none, "Analog Input 4", false, 0, false, false},
    {1, SoftIO, 0, none, " Soft IO 1", false, 0, false, false},
    {2, SoftIO, 0, none, " Soft IO 2", false, 0, false, false},
    {3, SoftIO, 0, none, " Soft IO 3", false, 0, false, false},
    {4, SoftIO, 0, none, " Soft IO 4", false, 0, false, false},
    {5, SoftIO, 0, none, " Soft IO 5", false, 0, false, false},
    {6, SoftIO, 0, none, " Soft IO 6", false, 0, false, false},
    {7, SoftIO, 0, none, " Soft IO 7", false, 0, false, false},
    {8, SoftIO, 0, none, " Soft IO 8", false, 0, false, false},
    {9, SoftIO, 0, none, " Soft IO 9", false, 0, false, false},
    {10, SoftIO, 0, none, " Soft IO 10", false, 0, false, false},
    {11, SoftIO, 0, none, " Soft IO 11", false, 0, false, false},
    {12, SoftIO, 0, none, " Soft IO 12", false, 0, false, false},
    {13, SoftIO, 0, none, " Soft IO 13", false, 0, false, false},
    {14, SoftIO, 0, none, " Soft IO 14", false, 0, false, false},
    {15, SoftIO, 0, none, " Soft IO 15", false, 0, false, false},
    {16, SoftIO, 0, none, " Soft IO 16", false, 0, false, false},
    {17, SoftIO, 0, none, " Soft IO 17", false, 0, false, false},
    {18, SoftIO, 0, none, " Soft IO 18", false, 0, false, false},
    {19, SoftIO, 0, none, " Soft IO 19", false, 0, false, false},
    {20, SoftIO, 0, none, " Soft IO 20", false, 0, false, false},
    {1, Timer, 0, oneShot, "Timer 1", false, 0, false, false},
    {2, Timer, 0, oneShot, "Timer 2", false, 0, false, false},
    {3, Timer, 0, oneShot, "Timer 3", false, 0, false, false},
    {4, Timer, 0, oneShot, "Timer 4", false, 0, false, false},
    {5, Timer, 0, oneShot, "Timer 5", false, 0, false, false},
    {6, Timer, 0, oneShot, "Timer 6", false, 0, false, false},
    {7, Timer, 0, oneShot, "Timer 7", false, 0, false, false},
    {8, Timer, 0, oneShot, "Timer 8", false, 0, false, false},
    {9, Timer, 0, oneShot, "Timer 9", false, 0, false, false},
    {10, Timer, 0, oneShot, "Timer 10", false, 0, false, false},
    {11, Timer, 0, oneShot, "Timer 11", false, 0, false, false},
    {12, Timer, 0, oneShot, "Timer 12", false, 0, false, false},
    {13, Timer, 0, oneShot, "Timer 13", false, 0, false, false},
    {14, Timer, 0, oneShot, "Timer 14", false, 0, false, false},
    {15, Timer, 0, oneShot, "Timer 15", false, 0, false, false},
    {16, Timer, 0, oneShot, "Timer 16", false, 0, false, false},
};

const char* CONFIG_FILE = "/config.json";
