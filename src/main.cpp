#include <Arduino.h>
#include <ESP32TimerInterrupt.h>  // Hardware Timer
#include <Preferences.h>          // NVS for WiFi credentials (can be shared)
#include <RTClib.h>               // timekeeping for scheduling
#include <TickTwo.h>              // Software Timer
#include <WiFi.h>                 // Needed for WiFi status checks
#include <WiFiUdp.h>              // Needed for ntpClient
#include <esp_task_wdt.h>         // Watchdog timer
#include <ntpclient.h>            // Network Time

#include "configPortal.h"   // Include config portal header
#include "dataStructure.h"  // Include data structures

TaskHandle_t networkTask;
void networkTaskFunction(void *pvParameters);
#define wdtTimeout 300  // Watchdog timeout (seconds)

void setup() {
  Serial.begin(115200);
  xTaskCreatePinnedToCore(networkTaskFunction, "networkTask",
                          32768,  // Increased stack size
                          NULL, 1, &networkTask, 0);
  esp_task_wdt_init(wdtTimeout, true);
  esp_task_wdt_add(NULL);
}

void loop() {
  delay(100);
  esp_task_wdt_reset();
}

void networkTaskFunction(void *pvParameters) {
  esp_task_wdt_init(wdtTimeout, true);
  esp_task_wdt_add(NULL);
  for (;;) {
    delay(100);
    esp_task_wdt_reset();
  }
}
