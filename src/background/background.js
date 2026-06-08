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

// Intercept message pipelines arriving from the Popup module layer
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerSweep') {
    blastTabClutter().then(() => sendResponse({ status: 'complete' }));
    return true; // Keeps channel asynchronous block active
  }
});