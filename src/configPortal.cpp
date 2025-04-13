#include "configPortal.h"

const char* CONFIG_FILE = "/config.json";

// General Configuration
struct deviceConfig {
  char SSID[30];
  char PASS[30];
  char DeviceName[30];
};

deviceConfig defaultConfig = {"Desktop_tamim", "12345678", "First Prototype"};

void initiateConfig() {
  LittleFS.begin();
  if (LittleFS.exists(CONFIG_FILE)) {
  } else {
    CreateDefaultIOVariables();
    InitializeDefaultLogicComponents();
  }
}

String generateJsonConfigString() {
  JsonDocument doc;

  JsonObject deviceSettings = doc["deviceSettings"].to<JsonObject>();
  deviceSettings["SSID"] = defaultConfig.SSID;
  deviceSettings["PASS"] = defaultConfig.PASS;
  deviceSettings["DeviceName"] = defaultConfig.DeviceName;

  JsonArray ioVariablesArray = doc["ioVariables"].to<JsonArray>();
  size_t numIOVariables = sizeof(IOVariables) / sizeof(IOVariables[0]);
  for (size_t i = 0; i < numIOVariables; i++) {
    JsonObject ioVariable = ioVariablesArray.add<JsonObject>();
    ioVariable["num"] = IOVariables[i].num;
    ioVariable["type"] = IOVariables[i].type;
    ioVariable["gpio"] = IOVariables[i].gpio;
    ioVariable["mode"] = IOVariables[i].mode;
    ioVariable["name"] = IOVariables[i].name;
    ioVariable["state"] = IOVariables[i].state;
    ioVariable["value"] = IOVariables[i].value;
    ioVariable["flag"] = IOVariables[i].flag;
    ioVariable["status"] = IOVariables[i].status;
  }
  JsonArray conditionsArray = doc["conditions"].to<JsonArray>();
  size_t numConditions = sizeof(conditions) / sizeof(conditions[0]);
  for (size_t i = 0; i < numConditions; i++) {
    JsonObject condition = conditionsArray.add<JsonObject>();
    condition["conNum"] = conditions[i].conNum;
    condition["name"] = conditions[i].name;
    condition["Type"] = conditions[i].Type;
    condition["trgtNum"] = conditions[i].targetNum;
    condition["comp"] = conditions[i].comp;
    condition["value"] = conditions[i].value;
    condition["status"] = conditions[i].status;
  }
  JsonArray conditionGroupsArray = doc["conditionGroups"].to<JsonArray>();
  size_t numConditionGroups =
      sizeof(conditionGroups) / sizeof(conditionGroups[0]);
  for (size_t i = 0; i < numConditionGroups; i++) {
    JsonObject conditionGroup = conditionGroupsArray.add<JsonObject>();
    conditionGroup["num"] = conditionGroups[i].num;
    conditionGroup["name"] = conditionGroups[i].name;
    JsonArray conditionArray = conditionGroup["condArr"].to<JsonArray>();
    JsonArray resultArray = conditionGroup["rsltArr"].to<JsonArray>();
    for (uint8_t j = 0; j < MAX_CONDITIONS_PER_GROUP; j++) {
      conditionArray.add(conditionGroups[i].conditionArray[j]);
      resultArray.add(conditionGroups[i].resultArray[j]);
    }
    conditionGroup["Logic"] = conditionGroups[i].Logic;
    conditionGroup["status"] = conditionGroups[i].status;
  }
  JsonArray actionsArray = doc["actions"].to<JsonArray>();
  size_t numActions = sizeof(actions) / sizeof(actions[0]);
  for (size_t i = 0; i < numActions; i++) {
    JsonObject action = actionsArray.add<JsonObject>();
    action["actNum"] = actions[i].actNum;
    action["name"] = actions[i].name;
    action["Type"] = actions[i].Type;
    action["targetNum"] = actions[i].targetNum;
    action["action"] = actions[i].action;
    action["value"] = actions[i].value;
    action["status"] = actions[i].status;
  }
  JsonArray actionGroupsArray = doc["actGrp"].to<JsonArray>();
  size_t numActionGroups = sizeof(actionGroups) / sizeof(actionGroups[0]);
  for (size_t i = 0; i < numActionGroups; i++) {
    JsonObject actionGroup = actionGroupsArray.add<JsonObject>();
    actionGroup["num"] = actionGroups[i].num;
    actionGroup["name"] = actionGroups[i].name;
    JsonArray actionArray = actionGroup["actArr"].to<JsonArray>();
    for (uint8_t j = 0; j < MAX_ACTIONS_PER_GROUP; j++) {
      actionArray.add(actionGroups[i].actionArray[j]);
    }
    actionGroup["status"] = actionGroups[i].status;
  }
  JsonArray rulesArray = doc["rules"].to<JsonArray>();
  size_t numRules = sizeof(rules) / sizeof(rules[0]);
  for (size_t i = 0; i < numRules; i++) {
    JsonObject rule = rulesArray.add<JsonObject>();
    rule["num"] = rules[i].num;
    rule["name"] = rules[i].name;
    rule["conGrp"] = rules[i].conditionGroup;
    rule["actGrp"] = rules[i].actionGroup;
    rule["status"] = rules[i].status;
  }
  JsonArray ruleSequenceArray = doc["ruleSequence"].to<JsonArray>();
  for (size_t i = 0; i < numRules; i++) {
    ruleSequenceArray.add(ruleSequence[i]);
  }

  String output;
  size_t written = serializeJson(doc, output);
  if (written > 0) {
    return output;
  } else {
    Serial.println(
        "ERROR: Failed to serialize current configuration to string.");
    return "{}";  // Return empty JSON object on error
  }
}