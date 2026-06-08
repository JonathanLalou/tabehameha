function saveOptions() {
  const delayValue = parseInt(document.getElementById('delayValue').value, 10) || 60;
  const delayUnit = document.getElementById('delayUnit').value;
  const minTitleLength = parseInt(document.getElementById('minTitleLength').value, 10) || 7;
  const collapseGroups = document.getElementById('collapseGroups').checked;
  const crossWindow = document.getElementById('crossWindow').checked;
  const includePinned = document.getElementById('includePinned').checked;
  const regroupExisting = document.getElementById('regroupExisting').checked;
  const excludeHosts = document.getElementById('excludeHosts').value;
  const hostAliases = document.getElementById('hostAliases').value;

  console.log(`[tabehameha] Options saving triggered: ${delayValue} ${delayUnit}(s) threshold.`);

  // Add these targeting rows inside saveOptions()
  const vaultValue = parseInt(document.getElementById('vaultValue').value, 10) || 4;
  const vaultUnit = document.getElementById('vaultUnit').value;

  // Include vaultValue and vaultUnit into your chrome.storage.sync.set schema object
  chrome.storage.sync.set({
    delayValue,
    delayUnit,
    vaultValue,
    vaultUnit,
    minTitleLength,
    collapseGroups,
    crossWindow,
    includePinned,
    regroupExisting,
    excludeHosts,
    hostAliases
  }, () => {
    const status = document.getElementById('statusMsg');
    status.textContent = '⚡ Saved configurations.';
    console.log("[tabehameha] Options successfully synchronized to sync profile storage.");
    setTimeout(() => { status.textContent = ''; }, 2500);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    delayValue: 60,
    delayUnit: 'minute',
    minTitleLength: 7,
    collapseGroups: true,
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    excludeHosts: '',
    hostAliases: ''
  }, (items) => {
    document.getElementById('delayValue').value = items.delayValue;
    document.getElementById('delayUnit').value = items.delayUnit;
    document.getElementById('minTitleLength').value = items.minTitleLength;
    document.getElementById('collapseGroups').checked = items.collapseGroups;
    document.getElementById('crossWindow').checked = items.crossWindow;
    document.getElementById('includePinned').checked = items.includePinned;
    document.getElementById('regroupExisting').checked = items.regroupExisting;
    document.getElementById('excludeHosts').value = items.excludeHosts;
    document.getElementById('hostAliases').value = items.hostAliases;
    console.log("[tabehameha] Options UI populated successfully from local configurations.");
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);