#include "dataStructure.h"

#include <stdio.h>

// === Define Global Arrays (matching extern declarations in .h) ===
IOVariable IOVariables[MAX_DIGITAL_IN + MAX_DIGITAL_OUT + MAX_ANALOG_IN +
                       MAX_SOFTIO + MAX_TIMERS];
condition conditions[MAX_CONDITIONS];
conditionGroup conditionGroups[MAX_CONDITION_GROUPS];
action actions[MAX_ACTIONS];
actionGroup actionGroups[MAX_ACTION_GROUPS];
rule rules[MAX_RULES];
uint8_t ruleSequence[MAX_RULES];
// ==============================================================

// Create a default Map for initial population if config doesn't exist
void CreateDefaultIOVariables() {
  uint8_t DI_GPIO[] = {4, 2, 15, 13, 12, 14};
  uint8_t DO_GPIO[] = {27, 26, 25, 33};
  uint8_t AI_GPIO[] = {35, 34, 39, 36};
  uint8_t DI_First = 0;
  uint8_t DI_Last = MAX_DIGITAL_IN - 1;
  uint8_t DO_First = DI_Last + 1;
  uint8_t DO_Last = DO_First + MAX_DIGITAL_OUT - 1;
  uint8_t AI_First = DO_Last + 1;
  uint8_t AI_Last = AI_First + MAX_ANALOG_IN - 1;
  uint8_t SoftIO_First = AI_Last + 1;
  uint8_t SoftIO_Last = SoftIO_First + MAX_SOFTIO - 1;
  uint8_t Timer_First = SoftIO_Last + 1;
  uint8_t Timer_Last = Timer_First + MAX_TIMERS - 1;
  for (uint8_t i = 0; i < MAX_DIGITAL_IN; i++) {
    IOVariables[i].num = i + 1;
    IOVariables[i].gpio = DI_GPIO[i];
    IOVariables[i].type = DigitalInput;
    IOVariables[i].mode = none;
    snprintf(IOVariables[i].name, sizeof(IOVariables[i].name),
             "Digital Input %d", i + 1);
    IOVariables[i].state = false;
    IOVariables[i].value = 0;
    IOVariables[i].flag = false;
    IOVariables[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_DIGITAL_OUT; i++) {
    IOVariables[i + DO_First].num = i + 1;
    IOVariables[i + DO_First].gpio = DO_GPIO[i];
    IOVariables[i + DO_First].type = DigitalOutput;
    IOVariables[i + DO_First].mode = none;
    snprintf(IOVariables[i + DO_First].name,
             sizeof(IOVariables[i + DO_First].name), "Digital Output %d",
             i + 1);
    IOVariables[i + DO_First].state = false;
    IOVariables[i + DO_First].value = 0;
    IOVariables[i + DO_First].flag = false;
    IOVariables[i + DO_First].status = false;
  }
  for (uint8_t i = 0; i < MAX_ANALOG_IN; i++) {
    IOVariables[i + AI_First].num = i + 1;
    IOVariables[i + AI_First].gpio = AI_GPIO[i];
    IOVariables[i + AI_First].type = AnalogInput;
    IOVariables[i + AI_First].mode = none;
    snprintf(IOVariables[i + AI_First].name,
             sizeof(IOVariables[i + AI_First].name), "Analog Input %d", i + 1);
    IOVariables[i + AI_First].state = false;
    IOVariables[i + AI_First].value = 0;
    IOVariables[i + AI_First].flag = false;
    IOVariables[i + AI_First].status = false;
  }
  for (uint8_t i = 0; i < MAX_SOFTIO; i++) {
    IOVariables[i + SoftIO_First].num = i + 1;
    IOVariables[i + SoftIO_First].gpio = 0;
    IOVariables[i + SoftIO_First].type = SoftIO;
    IOVariables[i + SoftIO_First].mode = none;
    snprintf(IOVariables[i + SoftIO_First].name,
             sizeof(IOVariables[i + SoftIO_First].name), "Soft IO %d", i + 1);
    IOVariables[i + SoftIO_First].state = false;
    IOVariables[i + SoftIO_First].value = 0;
    IOVariables[i + SoftIO_First].flag = false;
    IOVariables[i + SoftIO_First].status = false;
  }
  for (uint8_t i = 0; i < MAX_TIMERS; i++) {
    IOVariables[i + Timer_First].num = i + 1;
    IOVariables[i + Timer_First].gpio = 0;
    IOVariables[i + Timer_First].type = Timer;
    IOVariables[i + Timer_First].mode = oneShot;
    snprintf(IOVariables[i + Timer_First].name,
             sizeof(IOVariables[i + Timer_First].name), "Timer %d", i + 1);
    IOVariables[i + Timer_First].state = false;
    IOVariables[i + Timer_First].value = 0;
    IOVariables[i + Timer_First].flag = false;
    IOVariables[i + Timer_First].status = false;
  }
}

void InitializeDefaultLogicComponents() {
  for (uint8_t i = 0; i < MAX_CONDITIONS; i++) {
    conditions[i].conNum = i + 1;
    conditions[i].Type = SoftIO;
    conditions[i].targetNum = 0;
    conditions[i].comp = isTrue;
    conditions[i].value = 0;
    conditions[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_CONDITION_GROUPS; i++) {
    conditionGroups[i].num = i + 1;
    for (uint8_t j = 0; j < MAX_CONDITIONS_PER_GROUP; j++) {
      conditionGroups[i].conditionArray[j] = 0;
    }
    conditionGroups[i].Logic = andLogic;
    conditionGroups[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_ACTIONS; i++) {
    actions[i].actNum = i + 1;
    actions[i].Type = SoftIO;
    actions[i].targetNum = 0;
    actions[i].action = set;
    actions[i].value = 0;
    actions[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_ACTION_GROUPS; i++) {
    actionGroups[i].num = i + 1;
    for (uint8_t j = 0; j < MAX_ACTIONS_PER_GROUP; j++) {
      actionGroups[i].actionArray[j] = 0;
    }
    actionGroups[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_RULES; i++) {
    rules[i].num = i + 1;
    rules[i].useConditionGroup = false;  // Default to  a single condition
    rules[i].conditionSourceId = 0;      // Default to 0 (no valid ID)
    rules[i].useActionGroup = false;     // Default to  a single action
    rules[i].actionTargetId = 0;         // Default to 0 (no valid ID)
    rules[i].status = false;
  }
  for (uint8_t i = 0; i < MAX_RULES; i++) {
    ruleSequence[i] = i + 1;
  }
}
