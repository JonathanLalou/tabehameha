function saveOptions() {
  const delayValue = parseInt(document.getElementById('delayValue').value, 10) || 60;
  const delayUnit = document.getElementById('delayUnit').value;
  const minTitleLength = parseInt(document.getElementById('minTitleLength').value, 10) || 7;
  const crossWindow = document.getElementById('crossWindow').checked;
  const includePinned = document.getElementById('includePinned').checked;
  const regroupExisting = document.getElementById('regroupExisting').checked;
  const ungroupOnAccess = document.getElementById('ungroupOnAccess').checked;
  const excludeHosts = document.getElementById('excludeHosts').value;
  const hostAliases = document.getElementById('hostAliases').value;

  console.log(`[tabehameha] Options saving triggered: ${delayValue} ${delayUnit}(s) threshold.`);

  chrome.storage.sync.set({
    delayValue,
    delayUnit,
    minTitleLength,
    crossWindow,
    includePinned,
    regroupExisting,
    ungroupOnAccess,
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
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    ungroupOnAccess: false,
    excludeHosts: '',
    hostAliases: ''
  }, (items) => {
    document.getElementById('delayValue').value = items.delayValue;
    document.getElementById('delayUnit').value = items.delayUnit;
    document.getElementById('minTitleLength').value = items.minTitleLength;
    document.getElementById('crossWindow').checked = items.crossWindow;
    document.getElementById('includePinned').checked = items.includePinned;
    document.getElementById('regroupExisting').checked = items.regroupExisting;
    document.getElementById('ungroupOnAccess').checked = items.ungroupOnAccess;
    document.getElementById('excludeHosts').value = items.excludeHosts;
    document.getElementById('hostAliases').value = items.hostAliases;
    console.log("[tabehameha] Options UI populated successfully from local configurations.");
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);