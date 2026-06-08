import { blastTabClutter } from './groupingEngine.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log("⚡ [tabehameha] Background runtime installation cycle complete.");
  try {
    await chrome.alarms.create("tabehameha-check-alarm", { periodInMinutes: 1 });
    console.log("[tabehameha] Recurrent 1-minute tracking interval alarm successfully registered.");
  } catch (err) {
    console.error("[tabehameha] Failed to spin up background execution alarm:", err);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tabehameha-check-alarm") {
    console.log("[tabehameha] Alarm event fired. Initiating autonomous clustering pass.");
    blastTabClutter();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const settings = await chrome.storage.sync.get({ ungroupOnAccess: false });
    if (!settings.ungroupOnAccess) return;

    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      console.log(`[tabehameha] Tab ID ${tab.id} accessed by user. Extracting from current group context due to direct access rule.`);
      await chrome.tabs.ungroup(tab.id);
    }
  } catch (err) {
    console.error("[tabehameha] Tracking context update failure during extraction step:", err);
  }
});