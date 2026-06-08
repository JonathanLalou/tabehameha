function saveOptions() {
  chrome.storage.sync.set({
    delayMinutes: parseInt(document.getElementById('delayMinutes').value, 10) || 60,
    minTitleLength: parseInt(document.getElementById('minTitleLength').value, 10) || 7,
    crossWindow: document.getElementById('crossWindow').checked,
    includePinned: document.getElementById('includePinned').checked,
    regroupExisting: document.getElementById('regroupExisting').checked,
    ungroupOnAccess: document.getElementById('ungroupOnAccess').checked,
    excludeHosts: document.getElementById('excludeHosts').value,
    hostAliases: document.getElementById('hostAliases').value
  }, () => {
    const status = document.getElementById('statusMsg');
    status.textContent = '⚡ Saved configurations.';
    setTimeout(() => { status.textContent = ''; }, 2500);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    delayMinutes: 60,
    minTitleLength: 7,
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    ungroupOnAccess: false,
    excludeHosts: '',
    hostAliases: ''
  }, (items) => {
    document.getElementById('delayMinutes').value = items.delayMinutes;
    document.getElementById('minTitleLength').value = items.minTitleLength;
    document.getElementById('crossWindow').checked = items.crossWindow;
    document.getElementById('includePinned').checked = items.includePinned;
    document.getElementById('regroupExisting').checked = items.regroupExisting;
    document.getElementById('ungroupOnAccess').checked = items.ungroupOnAccess;
    document.getElementById('excludeHosts').value = items.excludeHosts;
    document.getElementById('hostAliases').value = items.hostAliases;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
