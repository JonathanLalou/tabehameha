function saveOptions() {
  const dormancyMode = document.getElementById('dormancyMode').value;
  const delayValue = parseInt(document.getElementById('delayValue').value, 10) || 60;
  const delayUnit = document.getElementById('delayUnit').value;
  const vaultValue = parseInt(document.getElementById('vaultValue').value, 10) || 4;
  const vaultUnit = document.getElementById('vaultUnit').value;
  const excludeHosts = document.getElementById('excludeHosts').value;
  const hostAliases = document.getElementById('hostAliases').value;
  const crossWindow = document.getElementById('crossWindow').checked;
  const includePinned = document.getElementById('includePinned').checked;
  const regroupExisting = document.getElementById('regroupExisting').checked;
  const collapseGroups = document.getElementById('collapseGroups').checked;
  const minTitleLength = parseInt(document.getElementById('minTitleLength').value, 10) || 7;

  chrome.storage.sync.set({
    dormancyMode,
    delayValue,
    delayUnit,
    vaultValue,
    vaultUnit,
    excludeHosts,
    hostAliases,
    crossWindow,
    includePinned,
    regroupExisting,
    collapseGroups,
    minTitleLength
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Hybrid engine configuration saved.';
    setTimeout(() => { status.textContent = ''; }, 2500);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    dormancyMode: 'sleep',
    delayValue: 60,
    delayUnit: 'minute',
    vaultValue: 4,
    vaultUnit: 'hour',
    excludeHosts: '',
    hostAliases: '',
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    collapseGroups: true,
    minTitleLength: 7
  }, (items) => {
    document.getElementById('dormancyMode').value = items.dormancyMode;
    document.getElementById('delayValue').value = items.delayValue;
    document.getElementById('delayUnit').value = items.delayUnit;
    document.getElementById('vaultValue').value = items.vaultValue;
    document.getElementById('vaultUnit').value = items.vaultUnit;
    document.getElementById('excludeHosts').value = items.excludeHosts;
    document.getElementById('hostAliases').value = items.hostAliases;
    document.getElementById('crossWindow').checked = items.crossWindow;
    document.getElementById('includePinned').checked = items.includePinned;
    document.getElementById('regroupExisting').checked = items.regroupExisting;
    document.getElementById('collapseGroups').checked = items.collapseGroups;
    document.getElementById('minTitleLength').value = items.minTitleLength;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);