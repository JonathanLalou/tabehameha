import { blastTabClutter } from '../background/groupingEngine.js';

document.getElementById('blastNowBtn').addEventListener('click', async () => {
  const btn = document.getElementById('blastNowBtn');
  btn.textContent = "💥 Blasting...";
  btn.disabled = true;
  try {
    await blastTabClutter();
    btn.textContent = "✨ Cleared!";
  } catch (e) {
    btn.textContent = "💥 Blast Tabs Now";
  }
  setTimeout(() => {
    btn.textContent = "💥 Blast Tabs Now";
    btn.disabled = false;
  }, 1200);
});

document.getElementById('openOptionsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
