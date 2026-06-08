const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

function flashToolbarAnimation() {
  let count = 0;
  const colors = ['#4a90e2', '#357abd', '#28a745', '#1a1a2e'];
  chrome.action.setBadgeText({ text: '⚡' });
  const intervalId = setInterval(() => {
    chrome.action.setBadgeBackgroundColor({ color: colors[count % colors.length] });
    count++;
    if (count > 6) {
      clearInterval(intervalId);
      chrome.action.setBadgeText({ text: '' });
    }
  }, 2000 / 6);
}

export function getNormalizedHost(urlStr, hostAliases) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.substring(4);
    if (hostAliases && hostAliases[host]) return hostAliases[host].toLowerCase();
    return host;
  } catch (e) { return null; }
}

export function getLongestCommonPrefix(strings) {
  if (!strings || strings.length === 0) return '';
  const sorted = [...strings].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let i = 0;
  while (i < first.length && first.charAt(i) === last.charAt(i)) i++;
  return first.substring(0, i).trim();
}

export function determineGroupTitle(tabs, domain, minTitleLength) {
  const titles = tabs.map(t => t.title || '');
  const prefix = getLongestCommonPrefix(titles);
  if (prefix && prefix.length >= minTitleLength) return prefix;
  return domain;
}

export async function getDistinctColor() {
  try {
    const existingGroups = await chrome.tabGroups.query({});
    const usedColors = existingGroups.map(g => g.color);
    const colorCounts = {};
    CHROME_COLORS.forEach(c => colorCounts[c] = 0);
    usedColors.forEach(c => { if (colorCounts[c] !== undefined) colorCounts[c]++; });
    let bestColor = CHROME_COLORS[0];
    let minCount = Infinity;
    for (const color of CHROME_COLORS) {
      if (colorCounts[color] < minCount) {
        minCount = colorCounts[color];
        bestColor = color;
      }
    }
    return bestColor;
  } catch (e) {
    return CHROME_COLORS[Math.floor(Math.random() * CHROME_COLORS.length)];
  }
}

export async function blastTabClutter() {
  const executionTime = new Date();
  const now = executionTime.getTime();

  flashToolbarAnimation();

  console.log(`[tabehameha] [${executionTime.toISOString()}] 🚀 Running Hybrid Optimization Pass...`);

  const settings = await chrome.storage.sync.get({
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
    minTitleLength: 7,
    collapseGroups: true
  });

  // Grouping Threshold
  const delayValueParsed = parseInt(settings.delayValue, 10) || 60;
  let groupUnitInMs = 60 * 1000;
  if (settings.delayUnit === 'second') groupUnitInMs = 1000;
  else if (settings.delayUnit === 'hour') groupUnitInMs = 60 * 60 * 1000;
  else if (settings.delayUnit === 'day') groupUnitInMs = 24 * 60 * 60 * 1000;
  const groupCutoff = now - (delayValueParsed * groupUnitInMs);

  // Deep Dormancy Threshold
  const vaultValueParsed = parseInt(settings.vaultValue, 10) || 4;
  let vaultUnitInMs = 60 * 1000;
  if (settings.vaultUnit === 'second') vaultUnitInMs = 1000;
  if (settings.vaultUnit === 'minute') vaultUnitInMs = 60 * 1000;
  else if (settings.vaultUnit === 'hour') vaultUnitInMs = 60 * 60 * 1000;
  else if (settings.vaultUnit === 'day') vaultUnitInMs = 24 * 60 * 60 * 1000;
  const vaultCutoff = now - (vaultValueParsed * vaultUnitInMs);

  const exclusions = settings.excludeHosts.split(/[\n,]+/).map(h => h.trim().toLowerCase()).filter(h => h.length > 0);
  const aliasesMap = {};
  settings.hostAliases.split(/[\n;]+/).forEach(line => {
    const parts = line.split('->');
    if (parts.length === 2) {
      const aliasPart = parts[0].trim().toLowerCase();
      const targetPart = parts[1].trim().toLowerCase();
      if (aliasPart && targetPart) aliasesMap[aliasPart] = targetPart;
    }
  });

  const tabs = await chrome.tabs.query({});
  const standardBuckets = {};
  const tabsToArchive = [];

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue;
    if (tab.active) continue;
    if (tab.pinned && !settings.includePinned) continue;

    const lastAccessed = tab.lastAccessed || now;
    const normHost = getNormalizedHost(tab.url, aliasesMap);
    if (!normHost) continue;
    if (exclusions.some(exc => normHost === exc || normHost.endsWith('.' + exc))) continue;

    // 1. EVALUATE DEEP DORMANCY (BUG FIXED EXTRA CHECK)
    if (settings.dormancyMode !== 'disabled' && lastAccessed <= vaultCutoff) {
      if (settings.dormancyMode === 'sleep') {
        // Only trigger native sleep if the tab is not already safely discarded
        if (!tab.discarded) {
          try {
            await chrome.tabs.discard(tab.id);
            console.log(`[tabehameha] Native sleep applied to tab: ${tab.title}`);
          } catch (e) {
            console.warn(`[tabehameha] Skipping discard safety loop on tab ${tab.id}: ${e.message}`);
          }
        }
      } else if (settings.dormancyMode === 'archive') {
        tabsToArchive.push({
          id: tab.id,
          url: tab.url,
          title: tab.title || tab.url,
          favIconUrl: tab.favIconUrl || '',
          host: normHost,
          vaultedAt: now
        });
        continue;
      }
    }

    // 2. STANDARD IDLE DOMAIN GROUPING CRITERIA
    if (lastAccessed <= groupCutoff) {
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !settings.regroupExisting) continue;

      const winKey = settings.crossWindow ? 'global' : tab.windowId;
      const incognitoKey = tab.incognito ? 'private' : 'standard';

      if (!standardBuckets[winKey]) standardBuckets[winKey] = {};
      if (!standardBuckets[winKey][incognitoKey]) standardBuckets[winKey][incognitoKey] = {};
      if (!standardBuckets[winKey][incognitoKey][normHost]) standardBuckets[winKey][incognitoKey][normHost] = [];

      standardBuckets[winKey][incognitoKey][normHost].push(tab);
    }
  }

  // COMMIT ACTIONS FOR HARD VAULT ARCHIVAL
  if (settings.dormancyMode === 'archive' && tabsToArchive.length > 0) {
    const storageData = await chrome.storage.local.get({ vaultStack: [] });
    let updatedStack = [...tabsToArchive, ...storageData.vaultStack];
    if (updatedStack.length > 500) updatedStack = updatedStack.slice(0, 500);
    await chrome.storage.local.set({ vaultStack: updatedStack });

    const tabIdsToClose = tabsToArchive.map(t => t.id);
    await chrome.tabs.remove(tabIdsToClose);
  }

  // EXECUTE CHROMIUM BATCH GROUPING OPERATIONS (BUG FIXED VERIFICATION LOOP)
  for (const winKey of Object.keys(standardBuckets)) {
    for (const incognitoKey of Object.keys(standardBuckets[winKey])) {
      for (const host of Object.keys(standardBuckets[winKey][incognitoKey])) {
        const matchingTabs = standardBuckets[winKey][incognitoKey][host];
        if (matchingTabs.length < 2) continue;

        // CRITICAL BUG FIX: Re-verify tab existence right before moving/grouping
        const validTabs = [];
        for (const t of matchingTabs) {
          try {
            const freshTabState = await chrome.tabs.get(t.id);
            validTabs.push(freshTabState);
          } catch (err) {
            console.warn(`[tabehameha] Pruned tab ID ${t.id} from queue because it was replaced/closed during discard cycle.`);
          }
        }

        if (validTabs.length < 2) continue;

        const targetTitle = determineGroupTitle(validTabs, host, settings.minTitleLength);
        const tabIds = validTabs.map(t => t.id);

        try {
          let groupId;
          const existingGroups = await chrome.tabGroups.query({
            title: targetTitle,
            windowId: winKey === 'global' ? undefined : parseInt(winKey, 10)
          });

          let matchedGroup = null;
          for (const g of existingGroups) {
            const gTabs = await chrome.tabs.query({ groupId: g.id });
            if (gTabs.length > 0 && gTabs[0].incognito === (incognitoKey === 'private')) {
              matchedGroup = g;
              break;
            }
          }

          if (matchedGroup) {
            if (settings.crossWindow) {
              for (const tab of validTabs) {
                if (tab.windowId !== matchedGroup.windowId) {
                  try { await chrome.tabs.move(tab.id, { windowId: matchedGroup.windowId, index: -1 }); } catch (e) {}
                }
              }
            }
            groupId = await chrome.tabs.group({ tabIds: tabIds, groupId: matchedGroup.id });
          } else {
            const targetWindowId = validTabs[0].windowId;
            if (settings.crossWindow) {
              for (const tab of validTabs) {
                if (tab.windowId !== targetWindowId) {
                  try { await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 }); } catch (e) {}
                }
              }
            }
            groupId = await chrome.tabs.group({ tabIds: tabIds });
            const freshColor = await getDistinctColor();
            await chrome.tabGroups.update(groupId, { title: targetTitle, color: freshColor });
          }
          await chrome.tabGroups.update(groupId, { collapsed: settings.collapseGroups });
        } catch (err) {
          console.error(`[tabehameha] Group execution failure on host ${host}:`, err);
        }
      }
    }
  }

  console.log(`[tabehameha] [${executionTime.toISOString()}] 🏁 Hybrid Sweep pass complete.`);
}