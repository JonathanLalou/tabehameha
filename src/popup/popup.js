document.addEventListener('DOMContentLoaded', () => {
  renderVault();

  // Manual execution override anchor
  document.getElementById('manualSweep').addEventListener('click', async () => {
    const sweepBtn = document.getElementById('manualSweep');
    sweepBtn.textContent = 'Sweeping...';
    sweepBtn.disabled = true;
    
    // Import module context background channels programmatically via service-worker message dispatch
    chrome.runtime.sendMessage({ action: 'triggerSweep' }, () => {
      setTimeout(() => {
        sweepBtn.textContent = 'Sweep Now';
        sweepBtn.disabled = false;
        renderVault();
      }, 1000);
    });
  });

  // Settings redirect
  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Live filter lookup engine
  document.getElementById('searchVault').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    renderVault(query);
  });
});

async function renderVault(filterQuery = '') {
  const listElement = document.getElementById('vaultList');
  const countElement = document.getElementById('vaultCount');
  
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

  filtered.forEach((tabItem, renderedIndex) => {
    const li = document.createElement('li');
    li.className = 'vault-item';

    // Information container block
    const infoDiv = document.createElement('div');
    infoDiv.className = 'tab-info';
    infoDiv.title = `Click to resurrect: ${tabItem.url}`;
    
    const icon = document.createElement('img');
    icon.className = 'tab-icon';
    icon.src = tabItem.favIconUrl || '../assets/tamehameha-48.png';
    // Graceful fallback image error block
    icon.onerror = () => { icon.src = '../assets/tamehameha-48.png'; };

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tabItem.title;

    infoDiv.appendChild(icon);
    infoDiv.appendChild(titleSpan);

    // Resurrect action hook
    infoDiv.addEventListener('click', async () => {
      await chrome.tabs.create({ url: tabItem.url, active: true });
      await deleteVaultItem(tabItem.vaultedAt, tabItem.url);
      renderVault(filterQuery);
    });

    // Individual delete purge button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Purge record permanently';
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
  // Filter using unique composite key signatures
  const filteredStack = storageData.vaultStack.filter(item => !(item.vaultedAt === vaultedAt && item.url === url));
  await chrome.storage.local.set({ vaultStack: filteredStack });
}