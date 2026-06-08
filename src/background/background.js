import { blastTabClutter } from './groupingEngine.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ [tabehameha] Background runtime installation cycle complete.");
  chrome.alarms.create('tabehamehaSweepAlarm', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tabehamehaSweepAlarm') {
    blastTabClutter();
  }
});

// Responds to manual runtime execution calls from the popup interface
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerSweep') {
    blastTabClutter().then(() => sendResponse({ status: 'complete' }));
    return true;
  }
});