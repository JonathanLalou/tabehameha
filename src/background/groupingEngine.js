const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

// Triggers a lightweight pulsing visual animation on the extension's toolbar icon
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
  }, 2000 / 6); // Rapidly pulse over a 2-second cycle
}

export function getNormalizedHost(urlStr, hostAliases) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.substring(4);
    if (hostAliases && hostAliases[host]) return hostAliases[host].toLowerCase();
    return host;
  } catch (e) {
    return null;
  }
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

// Map tabs that share implicit context relationships via History analysis
async function runContextualClustering(tabs, settings, now) {
  const contextualBuckets = {};

  // Look back into history for the last 3 hours to capture active research journeys
  const lookbackPeriod = 3 * 60 * 60 * 1000;
  const historyItems = await chrome.history.search({
    text: '',
    startTime: now - lookbackPeriod,
    maxResults: 200
  });

  // Create a fast lookup map of recent transitions
  const historyUrls = new Set(historyItems.map(item => item.url));

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue;
    if (tab.active || (tab.pinned && !settings.includePinned)) continue;
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !settings.regroupExisting) continue;

    let recognizedContext = null;

    // Sub-rule A: Native structural parent child relationship tracking
    if (tab.openerTabId) {
      try {
        const parentTab = await chrome.tabs.get(tab.openerTabId);
        if (parentTab && parentTab.url) {
          const parentHost = getNormalizedHost(parentTab.url);
          if (parentHost) recognizedContext = `Journey: ${parentHost}`;
        }
      } catch (e) { /* Parent tab was closed */ }
    }

    // Sub-rule B: Search Engine Query extraction for programmatic intent discovery
    if (!recognizedContext && (tab.url.includes('google.com/search') || tab.url.includes('bing.com/search'))) {
      try {
        const urlObj = new URL(tab.url);
        const queryParam = urlObj.searchParams.get('q');
        if (queryParam && queryParam.trim().length > 0) {
          recognizedContext = `Search: "${queryParam.trim().substring(0, 15)}..."`;
        }
      } catch (e) {}
    }

    // Assign to Context-Aware zones if tracking matched history paths
    if (recognizedContext) {
      const winKey = settings.crossWindow ? 'global' : tab.windowId;
      const incognitoKey = tab.incognito ? 'private' : 'standard';

      if (!contextualBuckets[winKey]) contextualBuckets[winKey] = {};
      if (!contextualBuckets[winKey][incognitoKey]) contextualBuckets[winKey][incognitoKey] = {};
      if (!contextualBuckets[winKey][incognitoKey][recognizedContext]) {
        contextualBuckets[winKey][incognitoKey][recognizedContext] = [];
      }
      contextualBuckets[winKey][incognitoKey][recognizedContext].push(tab);
    }
  }

  return contextualBuckets;
}

export async function blastTabClutter() {
  const executionTime = new Date();
  const now = executionTime.getTime();

  flashToolbarAnimation();

  console.log(`[tabehameha] [${executionTime.toISOString()}] 🚀 Initiating autonomous clustering & vaulting pass...`);

  const settings = await chrome.storage.sync.get({
    enableVault: true,
    enableFocusZones: true, // Master focus zone toggle option
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

  // Calculate Grouping Threshold
  const delayValueParsed = parseInt(settings.delayValue, 10) || 60;
  let groupUnitInMs = 60 * 1000;
  if (settings.delayUnit === 'second') groupUnitInMs = 1000;
  else if (settings.delayUnit === 'hour') groupUnitInMs = 60 * 60 * 1000;
  else if (settings.delayUnit === 'day') groupUnitInMs = 24 * 60 * 60 * 1000;
  const groupDelayMs = delayValueParsed * groupUnitInMs;
  const groupCutoff = now - groupDelayMs;

  // Calculate Vaulting Threshold
  const vaultValueParsed = parseInt(settings.vaultValue, 10) || 4;
  let vaultUnitInMs = 60 * 1000;
  if (settings.vaultUnit === 'second') vaultUnitInMs = 1000;
  if (settings.vaultUnit === 'minute') vaultUnitInMs = 60 * 1000;
  else if (settings.vaultUnit === 'hour') vaultUnitInMs = 60 * 60 * 1000;
  else if (settings.vaultUnit === 'day') vaultUnitInMs = 24 * 60 * 60 * 1000;
  const vaultDelayMs = vaultValueParsed * vaultUnitInMs;
  const vaultCutoff = now - vaultDelayMs;

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
  const tabsToVault = [];
  const processedContextTabIds = new Set();

  // FIRST RECON PASS: Adaptive Focus Zones (Context Tracking)
  let contextualBuckets = {};
  if (settings.enableFocusZones) {
    contextualBuckets = await runContextualClustering(tabs, settings, now);
  }

  // SECOND RECON PASS: Build out Vault arrays and fallbacks
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue;
    if (tab.active) continue;
    if (tab.pinned && !settings.includePinned) continue;

    const lastAccessed = tab.lastAccessed || now;
    const normHost = getNormalizedHost(tab.url, aliasesMap);
    if (!normHost) continue;
    if (exclusions.some(exc => normHost === exc || normHost.endsWith('.' + exc))) continue;

    // Check deep inactivity for Vault Archiving
    if (settings.enableVault && lastAccessed <= vaultCutoff) {
      tabsToVault.push({
        id: tab.id,
        url: tab.url,
        title: tab.title || tab.url,
        favIconUrl: tab.favIconUrl || '',
        host: normHost,
        vaultedAt: now
      });
      continue;
    }

    // Process context-aware matching tabs first if present
    let assignedToContext = false;
    if (settings.enableFocusZones) {
      const winKey = settings.crossWindow ? 'global' : tab.windowId;
      const incognitoKey = tab.incognito ? 'private' : 'standard';
      if (contextualBuckets[winKey] && contextualBuckets[winKey][incognitoKey]) {
        for (const zoneTitle of Object.keys(contextualBuckets[winKey][incognitoKey])) {
          const matchedZoneTabs = contextualBuckets[winKey][incognitoKey][zoneTitle];
          if (matchedZoneTabs.some(t => t.id === tab.id) && matchedZoneTabs.length >= 2) {
            assignedToContext = true;
            processedContextTabIds.add(tab.id);
            break;
          }
        }
      }
    }

    // Fall back to standard domain idle grouping if not swept up by focus zones
    if (!assignedToContext && lastAccessed <= groupCutoff) {
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !settings.regroupExisting) continue;

      const winKey = settings.crossWindow ? 'global' : tab.windowId;
      const incognitoKey = tab.incognito ? 'private' : 'standard';

      if (!standardBuckets[winKey]) standardBuckets[winKey] = {};
      if (!standardBuckets[winKey][incognitoKey]) standardBuckets[winKey][incognitoKey] = {};
      if (!standardBuckets[winKey][incognitoKey][normHost]) standardBuckets[winKey][incognitoKey][normHost] = [];

      standardBuckets[winKey][incognitoKey][normHost].push(tab);
    }
  }

  // EXECUTE VAULT ARCHIVING
  if (settings.enableVault && tabsToVault.length > 0) {
    const storageData = await chrome.storage.local.get({ vaultStack: [] });
    let updatedStack = [...tabsToVault, ...storageData.vaultStack];
    if (updatedStack.length > 500) updatedStack = updatedStack.slice(0, 500);
    await chrome.storage.local.set({ vaultStack: updatedStack });

    const tabIdsToClose = tabsToVault.map(t => t.id);
    await chrome.tabs.remove(tabIdsToClose);
  }

  // HELP ENFORCEMENT ENGINE FUNCTION
  async function applyChromeGrouping(winKey, incognitoKey, customGroupTitle, matchingTabs) {
    if (matchingTabs.length < 2) return;
    let tabIds = matchingTabs.map(t => t.id);

    try {
      let groupId;
      const existingGroups = await chrome.tabGroups.query({
        title: customGroupTitle,
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
          for (const tab of matchingTabs) {
            if (tab.windowId !== matchedGroup.windowId) {
              try { await chrome.tabs.move(tab.id, { windowId: matchedGroup.windowId, index: -1 }); } catch (e) {}
            }
          }
        }
        groupId = await chrome.tabs.group({ tabIds: tabIds, groupId: matchedGroup.id });
      } else {
        const targetWindowId = matchingTabs[0].windowId;
        if (settings.crossWindow) {
          for (const tab of matchingTabs) {
            if (tab.windowId !== targetWindowId) {
              try { await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 }); } catch (e) {}
            }
          }
        }
        groupId = await chrome.tabs.group({ tabIds: tabIds });
        const freshColor = await getDistinctColor();
        await chrome.tabGroups.update(groupId, { title: customGroupTitle, color: freshColor });
      }
      await chrome.tabGroups.update(groupId, { collapsed: settings.collapseGroups });
    } catch (err) {
      console.error(`[tabehameha] Critical group assignment failure:`, err);
    }
  }

  // EXECUTE CONTEXTUAL GROUPING DEPLOYMENTS FIRST
  if (settings.enableFocusZones) {
    for (const winKey of Object.keys(contextualBuckets)) {
      for (const incognitoKey of Object.keys(contextualBuckets[winKey])) {
        for (const zoneTitle of Object.keys(contextualBuckets[winKey][incognitoKey])) {
          const zoneTabs = contextualBuckets[winKey][incognitoKey][zoneTitle];
          await applyChromeGrouping(winKey, incognitoKey, zoneTitle, zoneTabs);
        }
      }
    }
  }

  // EXECUTE DOMAIN PATTERN SWEETS SECOND
  for (const winKey of Object.keys(standardBuckets)) {
    for (const incognitoKey of Object.keys(standardBuckets[winKey])) {
      for (const host of Object.keys(standardBuckets[winKey][incognitoKey])) {
        const matchingTabs = standardBuckets[winKey][incognitoKey][host];
        const targetTitle = determineGroupTitle(matchingTabs, host, settings.minTitleLength);
        await applyChromeGrouping(winKey, incognitoKey, targetTitle, matchingTabs);
      }
    }
  }

  console.log(`[tabehameha] [${executionTime.toISOString()}] 🏁 Cluster & Vault sweep pass completed.`);
}