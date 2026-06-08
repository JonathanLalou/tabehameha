document.addEventListener('DOMContentLoaded', async () => {
  const syncSettings = await chrome.storage.sync.get({ enableVault: true });

  if (!syncSettings.enableVault) {
    document.getElementById('vaultBulkActions').style.display = 'none';
    document.getElementById('searchVault').style.display = 'none';
    document.getElementById('vaultList').style.display = 'none';
    document.getElementById('vaultDisabledMessage').style.display = 'block';
    document.getElementById('vaultCount').textContent = '-';
  } else {
    renderVault();

    document.getElementById('searchVault').addEventListener('input', (e) => {
      renderVault(e.target.value.toLowerCase());
    });

    // Bulk Restore Event Listener
    document.getElementById('restoreAllBtn').addEventListener('click', async () => {
      const storageData = await chrome.storage.local.get({ vaultStack: [] });
      if (storageData.vaultStack.length === 0) return;

      if (confirm(`Resurrect all ${storageData.vaultStack.length} tabs back into active browser windows?`)) {
        for (const tabItem of storageData.vaultStack) {
          try { await chrome.tabs.create({ url: tabItem.url, active: false }); } catch (e) {}
        }
        await chrome.storage.local.set({ vaultStack: [] });
        renderVault();
      }
    });

    // Bulk Purge Event Listener
    document.getElementById('purgeAllBtn').addEventListener('click', async () => {
      const storageData = await chrome.storage.local.get({ vaultStack: [] });
      if (storageData.vaultStack.length === 0) return;

      if (confirm("Permanently delete and erase all currently vaulted items? This cannot be undone.")) {
        await chrome.storage.local.set({ vaultStack: [] });
        renderVault();
      }
    });
  }

  // Manual trigger routing override handler
  document.getElementById('manualSweep').addEventListener('click', async () => {
    const sweepBtn = document.getElementById('manualSweep');
    sweepBtn.textContent = 'Sweeping...';
    sweepBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'triggerSweep' }, () => {
      setTimeout(() => {
        sweepBtn.textContent = 'Sweep Now';
        sweepBtn.disabled = false;
        if (syncSettings.enableVault) renderVault();
      }, 1200);
    });
  });

  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

async function renderVault(filterQuery = '') {
  const listElement = document.getElementById('vaultList');
  const countElement = document.getElementById('vaultCount');
  if (!listElement) return;

  const storageData = await chrome.storage.local.get({ vaultStack: [] });
  const records = storageData.vaultStack;

  const filtered = records.filter(item =>
    item.title.toLowerCase().includes(filterQuery) ||
    item.url.toLowerCase().includes(filterQuery)
  );

  countElement.textContent = filtered.length;
  listElement.innerHTML = '';

  if (filtered.length === 0) {
    listElement.innerHTML = `<li class="empty-state">${filterQuery ? 'No matching tabs found.' : 'The Vault is empty.'}</li>`;
    return;
  }

  filtered.forEach((tabItem) => {
    const li = document.createElement('li');
    li.className = 'vault-item';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'tab-info';
    infoDiv.title = `Click to resurrect: ${tabItem.url}`;

    const icon = document.createElement('img');
    icon.className = 'tab-icon';
    icon.src = tabItem.favIconUrl || '../assets/tamehameha-48.png';
    icon.onerror = () => { icon.src = '../assets/tamehameha-48.png'; };

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tabItem.title;

    infoDiv.appendChild(icon);
    infoDiv.appendChild(titleSpan);

    // Row Click: Resurrect tab
    infoDiv.addEventListener('click', async () => {
      await chrome.tabs.create({ url: tabItem.url, active: true });
      await deleteVaultItem(tabItem.vaultedAt, tabItem.url);
      renderVault(filterQuery);
    });

    // Close Button Click: Forget tab permanently without opening
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Forget tab entry permanently';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteVaultItem(tabItem.vaultedAt, tabItem.url);
      renderVault(filterQuery);
    });

    li.appendChild(infoDiv);
    li.appendChild(delBtn);
    listElement.appendChild(li);
  });
}

async function deleteVaultItem(vaultedAt, url) {
  const storageData = await chrome.storage.local.get({ vaultStack: [] });
  const filteredStack = storageData.vaultStack.filter(item => !(item.vaultedAt === vaultedAt && item.url === url));
  await chrome.storage.local.set({ vaultStack: filteredStack });
}