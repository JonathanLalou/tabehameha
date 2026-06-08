import { blastTabClutter } from './groupingEngine.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log("⚡ Tabehameha engine active.");
  await chrome.alarms.create("tabehameha-check-alarm", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tabehameha-check-alarm") {
    blastTabClutter();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const settings = await chrome.storage.sync.get({ ungroupOnAccess: false });
  if (!settings.ungroupOnAccess) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      await chrome.tabs.ungroup(tab.id);
    }
  } catch (e) {}
});
