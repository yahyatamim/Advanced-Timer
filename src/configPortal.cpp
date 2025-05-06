#include "configPortal.h"

#include <ESPmDNS.h>
#define defaultSSID "advancedtimer"
#define defaultPASS "12345678"

AsyncWebServer server(80);

const char *CONFIG_FILE = "/config.json";

// General Configuration
struct deviceConfig {
  char SSID[30];
  char PASS[30];
  char DeviceName[30];
  bool run;  // IF program runs or stop
};

deviceConfig defaultConfig = {"Desktop_tamim", "12345678", "AdvancedTimer",
                              false};

bool saveConfigToFile() {
  String jsonConfig = generateJsonConfigString();
  File configFile = LittleFS.open(CONFIG_FILE, FILE_WRITE);
  if (!configFile) {
    return false;  // Failed to open file for writing
  }
  size_t bytesWritten = configFile.print(jsonConfig);
  configFile.close();
  return bytesWritten > 0;  // Return true if something was written
}

void initiateConfig() {
  if (!LittleFS.begin()) {
    CreateDefaultIOVariables();
    InitializeDefaultLogicComponents();
    return;
  }

  if (LittleFS.exists(CONFIG_FILE)) {
    File configFile = LittleFS.open(CONFIG_FILE, FILE_READ);
    if (configFile) {
      String configData = configFile.readString();
      configFile.close();
      parseJsonConfigString(configData);  // Load existing config
    } else {
      // File exists but couldn't be opened? Fallback to defaults.
      CreateDefaultIOVariables();
      InitializeDefaultLogicComponents();
      saveConfigToFile();  // Try to save defaults even if read failed
    }
  } else {
    // Config file doesn't exist, create defaults and save
    CreateDefaultIOVariables();
    InitializeDefaultLogicComponents();
    saveConfigToFile();
  }
}

String generateJsonConfigString() {
  JsonDocument doc;

  JsonObject deviceSettings = doc["deviceSettings"].to<JsonObject>();
  deviceSettings["SSID"] = defaultConfig.SSID;
  deviceSettings["PASS"] = defaultConfig.PASS;
  deviceSettings["DeviceName"] = defaultConfig.DeviceName;
  deviceSettings["run"] = defaultConfig.run;

  JsonArray ioVariablesArray = doc["ioVariables"].to<JsonArray>();
  size_t numIOVariables = sizeof(IOVariables) / sizeof(IOVariables[0]);
  for (size_t i = 0; i < numIOVariables; i++) {
    JsonObject ioVariable = ioVariablesArray.add<JsonObject>();
    ioVariable["n"] = IOVariables[i].num;
    ioVariable["t"] = IOVariables[i].type;
    ioVariable["g"] = IOVariables[i].gpio;
    ioVariable["m"] = IOVariables[i].mode;
    ioVariable["nm"] = IOVariables[i].name;
    ioVariable["st"] = IOVariables[i].state;
    ioVariable["v"] = IOVariables[i].value;
    ioVariable["f"] = IOVariables[i].flag;
    ioVariable["s"] = IOVariables[i].status;
  }
  JsonArray conditionsArray = doc["conditions"].to<JsonArray>();
  size_t numConditions = sizeof(conditions) / sizeof(conditions[0]);
  for (size_t i = 0; i < numConditions; i++) {
    JsonObject condition = conditionsArray.add<JsonObject>();
    condition["cn"] = conditions[i].conNum;
    condition["t"] = conditions[i].Type;
    condition["tn"] = conditions[i].targetNum;
    condition["cp"] = conditions[i].comp;
    condition["v"] = conditions[i].value;
    condition["s"] = conditions[i].status;
  }
  JsonArray conditionGroupsArray = doc["conditionGroups"].to<JsonArray>();
  size_t numConditionGroups =
      sizeof(conditionGroups) / sizeof(conditionGroups[0]);
  for (size_t i = 0; i < numConditionGroups; i++) {
    JsonObject conditionGroup = conditionGroupsArray.add<JsonObject>();
    conditionGroup["n"] = conditionGroups[i].num;
    JsonArray conditionArray = conditionGroup["ca"].to<JsonArray>();
    JsonArray resultArray = conditionGroup["ra"].to<JsonArray>();
    for (uint8_t j = 0; j < MAX_CONDITIONS_PER_GROUP; j++) {
      conditionArray.add(conditionGroups[i].conditionArray[j]);
    }
    conditionGroup["l"] = conditionGroups[i].Logic;
    conditionGroup["s"] = conditionGroups[i].status;
  }
  JsonArray actionsArray = doc["actions"].to<JsonArray>();
  size_t numActions = sizeof(actions) / sizeof(actions[0]);
  for (size_t i = 0; i < numActions; i++) {
    JsonObject action = actionsArray.add<JsonObject>();
    action["an"] = actions[i].actNum;
    action["t"] = actions[i].Type;
    action["tn"] = actions[i].targetNum;
    action["a"] = actions[i].action;
    action["v"] = actions[i].value;
    action["s"] = actions[i].status;
  }
  JsonArray actionGroupsArray = doc["actionGroups"].to<JsonArray>();
  size_t numActionGroups = sizeof(actionGroups) / sizeof(actionGroups[0]);
  for (size_t i = 0; i < numActionGroups; i++) {
    JsonObject actionGroup = actionGroupsArray.add<JsonObject>();
    actionGroup["n"] = actionGroups[i].num;
    JsonArray actionArray = actionGroup["ar"].to<JsonArray>();
    for (uint8_t j = 0; j < MAX_ACTIONS_PER_GROUP; j++) {
      actionArray.add(actionGroups[i].actionArray[j]);
    }
    actionGroup["s"] = actionGroups[i].status;
  }
  JsonArray rulesArray = doc["rules"].to<JsonArray>();
  size_t numRules = sizeof(rules) / sizeof(rules[0]);
  for (size_t i = 0; i < numRules; i++) {
    JsonObject rule = rulesArray.add<JsonObject>();
    rule["n"] = rules[i].num;
    rule["cg"] = rules[i].useConditionGroup;
    rule["ci"] = rules[i].conditionSourceId;
    rule["ag"] = rules[i].useActionGroup;
    rule["ai"] = rules[i].actionTargetId;
    rule["s"] = rules[i].status;
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

// --- Simplified JSON Parser (ArduinoJson v7) ---
bool parseJsonConfigString(const String &jsonString) {
  JsonDocument doc;  // ArduinoJson v7

  // Attempt to deserialize, ignore errors for simplification
  deserializeJson(doc, jsonString);

  // --- Parse Device Settings (using full keys as generated) ---
  JsonObject ds = doc["deviceSettings"];
  strlcpy(defaultConfig.SSID, ds["SSID"] | "", sizeof(defaultConfig.SSID));
  strlcpy(defaultConfig.PASS, ds["PASS"] | "", sizeof(defaultConfig.PASS));
  strlcpy(defaultConfig.DeviceName, ds["DeviceName"] | "",
          sizeof(defaultConfig.DeviceName));
  defaultConfig.run = ds["run"] | false;

  // --- Parse IO Variables (using full top-level key "ioVariables") ---
  JsonArray ioArray = doc["ioVariables"];
  int i_io = 0;
  for (JsonObject ioVarJson : ioArray) {
    // Assume index is within bounds
    IOVariables[i_io].num = ioVarJson["n"] | IOVariables[i_io].num;
    IOVariables[i_io].type =
        (dataTypes)(ioVarJson["t"] | IOVariables[i_io].type);
    IOVariables[i_io].gpio = ioVarJson["g"] | IOVariables[i_io].gpio;
    IOVariables[i_io].mode =
        (operationMode)(ioVarJson["m"] | IOVariables[i_io].mode);
    strlcpy(IOVariables[i_io].name, ioVarJson["nm"] | IOVariables[i_io].name,
            sizeof(IOVariables[i_io].name));
    IOVariables[i_io].state = ioVarJson["st"] | IOVariables[i_io].state;
    IOVariables[i_io].value = ioVarJson["v"] | IOVariables[i_io].value;
    IOVariables[i_io].flag = ioVarJson["f"] | IOVariables[i_io].flag;
    IOVariables[i_io].status = ioVarJson["s"] | IOVariables[i_io].status;
    i_io++;
  }

  // --- Parse Conditions (using full top-level key "conditions") ---
  JsonArray coArray = doc["conditions"];
  int i_co = 0;
  for (JsonObject condJson : coArray) {
    conditions[i_co].conNum = condJson["cn"] | conditions[i_co].conNum;
    conditions[i_co].Type = (dataTypes)(condJson["t"] | conditions[i_co].Type);
    conditions[i_co].targetNum = condJson["tn"] | conditions[i_co].targetNum;
    conditions[i_co].comp =
        (comparisons)(condJson["cp"] | conditions[i_co].comp);
    conditions[i_co].value = condJson["v"] | conditions[i_co].value;
    conditions[i_co].status = condJson["s"] | conditions[i_co].status;
    i_co++;
  }

  // --- Parse Condition Groups (using full top-level key "conditionGroups") ---
  JsonArray cgArray = doc["conditionGroups"];
  int i_cg = 0;
  for (JsonObject cgJson : cgArray) {
    conditionGroups[i_cg].num = cgJson["n"] | conditionGroups[i_cg].num;
    conditionGroups[i_cg].Logic =
        (combineLogic)(cgJson["l"] | conditionGroups[i_cg].Logic);
    conditionGroups[i_cg].status = cgJson["s"] | conditionGroups[i_cg].status;

    JsonArray caJson = cgJson["ca"];
    int j_ca = 0;
    for (JsonVariant val : caJson) {
      if (j_ca >= MAX_CONDITIONS_PER_GROUP) break;  // Keep this bounds check
      conditionGroups[i_cg].conditionArray[j_ca] = val.as<uint8_t>() | 0;
      j_ca++;
    }
    for (; j_ca < MAX_CONDITIONS_PER_GROUP; ++j_ca) {  // Zero fill rest
      conditionGroups[i_cg].conditionArray[j_ca] = 0;
    }
    i_cg++;
  }

  // --- Parse Actions (using full top-level key "actions") ---
  JsonArray acArray = doc["actions"];
  int i_ac = 0;
  for (JsonObject actJson : acArray) {
    actions[i_ac].actNum = actJson["an"] | actions[i_ac].actNum;
    actions[i_ac].Type = (dataTypes)(actJson["t"] | actions[i_ac].Type);
    actions[i_ac].targetNum = actJson["tn"] | actions[i_ac].targetNum;
    actions[i_ac].action = (actionType)(actJson["a"] | actions[i_ac].action);
    actions[i_ac].value = actJson["v"] | actions[i_ac].value;
    actions[i_ac].status = actJson["s"] | actions[i_ac].status;
    i_ac++;
  }

  // --- Parse Action Groups (using full top-level key "actionGroups") ---
  JsonArray agArray = doc["actionGroups"];
  int i_ag = 0;
  for (JsonObject agJson : agArray) {
    actionGroups[i_ag].num = agJson["n"] | actionGroups[i_ag].num;
    actionGroups[i_ag].status = agJson["s"] | actionGroups[i_ag].status;
    JsonArray arJson = agJson["ar"];  // Use 'ar' as generated
    int j_ar = 0;
    for (JsonVariant val : arJson) {
      if (j_ar >= MAX_ACTIONS_PER_GROUP) break;  // Keep this bounds check
      actionGroups[i_ag].actionArray[j_ar] = val.as<uint8_t>() | 0;
      j_ar++;
    }
    for (; j_ar < MAX_ACTIONS_PER_GROUP; ++j_ar) {  // Zero fill rest
      actionGroups[i_ag].actionArray[j_ar] = 0;
    }
    i_ag++;
  }

  // --- Parse Rules (using full top-level key "rules") ---
  JsonArray ruArray = doc["rules"];
  int i_ru = 0;
  for (JsonObject ruleJson : ruArray) {
    rules[i_ru].num = ruleJson["n"] | rules[i_ru].num;
    rules[i_ru].useConditionGroup = ruleJson["cg"] | false;
    rules[i_ru].conditionSourceId = ruleJson["ci"] | 0;
    rules[i_ru].useActionGroup = ruleJson["ag"] | false;
    rules[i_ru].actionTargetId = ruleJson["ai"] | 0;
    rules[i_ru].status = ruleJson["s"] | rules[i_ru].status;
    i_ru++;
  }

  // --- Parse Rule Sequence (using full top-level key "ruleSequence") ---
  JsonArray rsArray = doc["ruleSequence"];
  int i_rs = 0;
  size_t maxRules = sizeof(rules) / sizeof(rules[0]);
  for (JsonVariant val : rsArray) {
    if (i_rs >= maxRules) break;  // Keep this bounds check
    ruleSequence[i_rs] = val.as<uint8_t>() | (i_rs + 1);
    i_rs++;
  }
  for (; i_rs < maxRules; ++i_rs) {  // Default fill rest
    ruleSequence[i_rs] = i_rs + 1;
  }

  return true;  // Assume success
}

bool initiateWiFi() {
  WiFi.begin(defaultSSID, defaultPASS);
  uint8_t attempt = 0;
  Serial.println("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED and attempt < 4) {
    attempt++;
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.begin(defaultConfig.SSID, defaultConfig.PASS);
  }
  attempt = 0;
  while (WiFi.status() != WL_CONNECTED and attempt < 10) {
    attempt++;
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    return true;
  } else {
    return false;
  }
}

// --- Web Server Setup --- <<< Add This Section
void setupWebServer() {
  // Serve Static Files from LittleFS
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.serveStatic("/style.css", LittleFS, "/style.css");
  server.serveStatic("/bootstrap.min.css", LittleFS, "/bootstrap.min.css");
  server.serveStatic("/script.js", LittleFS, "/script.js");
  server.serveStatic("/Sortable.min.js", LittleFS, "/Sortable.min.js");
  server.serveStatic("/favicon.ico", LittleFS, "/favicon.ico");

  // Handle GET request for configuration
  server.on("/config", HTTP_GET, [](AsyncWebServerRequest *request) {
    String jsonConfig = generateJsonConfigString();
    request->send(200, "application/json", jsonConfig);
  });

  // Handle POST request for configuration
  server.on(
      "/config", HTTP_POST, [](AsyncWebServerRequest *request) {},
      NULL,  // No file upload handler needed here
      [](AsyncWebServerRequest *request, uint8_t *data, size_t len,
         size_t index, size_t total) {
        static String bodyContent = "";
        if (index == 0) {
          bodyContent = "";
          // Clear previous content
          // Optional: Check Content-Type if needed
          // if(request->contentType() != "application/json"){
          //     request->send(400, "text/plain", "Bad Request: Expected
          //     application/json"); return;
          // }
        }

        // Append data chunk to bodyContent
        bodyContent.concat((char *)data, len);

        if (index + len == total) {  // Last chunk received
          Serial.println("Received config POST:");
          Serial.println(bodyContent);  // Print received JSON for debugging

          if (parseJsonConfigString(bodyContent)) {
            if (saveConfigToFile()) {
              request->send(200, "text/plain", "OK");
              // Schedule restart after sending response
              delay(1000);  // Short delay to allow response to send
              ESP.restart();
            } else {
              request->send(500, "text/plain", "Failed to save configuration");
            }
          } else {
            request->send(400, "text/plain",
                          "Failed to parse configuration JSON");
          }
          bodyContent = "";  // Clear buffer for next request
        }
      });

  // Handle Not Found
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404, "text/plain", "Not found");
  });

  // Start mDNS (optional but helpful)
  if (MDNS.begin("advancedtimer")) {  // Use device name for mDNS
    MDNS.addService("http", "tcp", 80);
    Serial.print("mDNS responder started: http://");
    Serial.print("advancedtimer");
    Serial.println(".local");
  } else {
    Serial.println("Error setting up MDNS responder!");
  }

  server.begin();  // Start the server
  Serial.println("Web server started");
}
// --- End Web Server Setup ---