#ifndef CONFIG_PORTAL_H
#define CONFIG_PORTAL_H

#include <Arduino.h>
// ArduinoJSON V7 StaticJSONDocument & DynamicJSON Document are depricated.
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <WiFi.h>

#include "dataStructure.h"

// Declare the server object
extern AsyncWebServer server;  // <<< Add This

void initiateConfig();
String generateJsonConfigString();
bool parseJsonConfigString(const String& jsonString);
bool saveConfigToFile();  // <<< Add prototype if not already present
bool initiateWiFi();
void setupWebServer();  // <<< Add This: Function to configure server routes

#endif  // CONFIG_PORTAL_H
