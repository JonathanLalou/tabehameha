// src/background/background.js

import { blastTabClutter } from './groupingEngine.js';

// Setup background alarms
chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ [tabehameha] Background runtime installation cycle complete.");
  chrome.alarms.create('tabehamehaSweepAlarm', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tabehamehaSweepAlarm') {
    blastTabClutter();
  }
});

// CORE FIX: Unified Auto-Extraction Engine
async function handleTabExtraction(tabId) {
  try {
    const settings = await chrome.storage.sync.get({ extractOnAccess: false });
    if (!settings.extractOnAccess) return;

    const tab = await chrome.tabs.get(tabId);
    // If the active tab is assigned to a group, kick it out!
    if (tab && tab.active && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      console.log(`[tabehameha] Extracting Tab ID ${tabId} ("${tab.title}") due to direct user access.`);
      await chrome.tabs.ungroup(tabId);
    }
  } catch (err) {
    // Fail silently if tab was closed rapidly
  }
}

// Fire when active tab changes inside a window
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabExtraction(activeInfo.tabId);
});

// Fire when a tab updates (e.g. finishes loading, is focused across windows, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || tab.active) {
    handleTabExtraction(tabId);
  }
});