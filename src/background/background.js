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