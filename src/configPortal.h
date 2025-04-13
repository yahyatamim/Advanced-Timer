#ifndef CONFIG_PORTAL_H
#define CONFIG_PORTAL_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <WiFi.h>

#include "dataStructure.h"

void initiateConfig();
String generateJsonConfigString();

#endif  // CONFIG_PORTAL_H
