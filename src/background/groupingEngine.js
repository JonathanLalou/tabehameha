// src/background/groupingEngine.js

const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

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

export async function blastTabClutter() {
  console.log("[tabehameha] Starting tab clustering sweep...");

  const settings = await chrome.storage.sync.get({
    delayValue: 60,
    delayUnit: 'minute',
    excludeHosts: '',
    hostAliases: '',
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    minTitleLength: 7,
    collapseGroups: true // New configuration property
  });

  let unitInMs = 60 * 1000;
  if (settings.delayUnit === 'second') unitInMs = 1000;
  else if (settings.delayUnit === 'hour') unitInMs = 60 * 60 * 1000;
  else if (settings.delayUnit === 'day') unitInMs = 24 * 60 * 60 * 1000;

  const totalDelayMs = settings.delayValue * unitInMs;
  const now = Date.now();
  const cutoffTime = now - totalDelayMs;

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
  const buckets = {};

  tabs.forEach(tab => {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) return;
    if (tab.active) return;

    const lastAccessed = tab.lastAccessed || now;
    if (lastAccessed > cutoffTime) return;
    if (tab.pinned && !settings.includePinned) return;
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !settings.regroupExisting) return;

    const normHost = getNormalizedHost(tab.url, aliasesMap);
    if (!normHost) return;

    if (exclusions.some(exc => normHost === exc || normHost.endsWith('.' + exc))) return;

    const winKey = settings.crossWindow ? 'global' : tab.windowId;
    const incognitoKey = tab.incognito ? 'private' : 'standard';

    if (!buckets[winKey]) buckets[winKey] = {};
    if (!buckets[winKey][incognitoKey]) buckets[winKey][incognitoKey] = {};
    if (!buckets[winKey][incognitoKey][normHost]) buckets[winKey][incognitoKey][normHost] = [];

    buckets[winKey][incognitoKey][normHost].push(tab);
  });

  for (const winKey of Object.keys(buckets)) {
    for (const incognitoKey of Object.keys(buckets[winKey])) {
      for (const host of Object.keys(buckets[winKey][incognitoKey])) {
        const matchingTabs = buckets[winKey][incognitoKey][host];
        if (matchingTabs.length < 2) continue;

        let tabIds = matchingTabs.map(t => t.id);
        const targetTitle = determineGroupTitle(matchingTabs, host, settings.minTitleLength);

        try {
          let groupId;
          const existingGroups = await chrome.tabGroups.query({
            title: targetTitle,
            windowId: winKey === 'global' ? undefined : parseInt(winKey)
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
            // FIX MULTI-WINDOW: If crossWindow is true, explicitly move tabs to the target group's window first
            if (settings.crossWindow) {
              for (const tab of matchingTabs) {
                if (tab.windowId !== matchedGroup.windowId) {
                  try {
                    await chrome.tabs.move(tab.id, { windowId: matchedGroup.windowId, index: -1 });
                  } catch (e) { console.warn("[tabehameha] Failed pre-moving cross-window tab safety pass", e); }
                }
              }
            }
            groupId = await chrome.tabs.group({ tabIds: tabIds, groupId: matchedGroup.id });
          } else {
            // FIX MULTI-WINDOW: If creating a fresh group globally across multiple windows,
            // explicitly consolidate all target tabs into the first tab's window prior to grouping
            // so window-destruction closures won't interrupt the Chrome internal tab tracker.
            const targetWindowId = matchingTabs[0].windowId;
            if (settings.crossWindow) {
              for (const tab of matchingTabs) {
                if (tab.windowId !== targetWindowId) {
                  try {
                    await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 });
                  } catch (e) { console.warn("[tabehameha] Failed pre-moving cross-window tab safety pass", e); }
                }
              }
            }

            groupId = await chrome.tabs.group({ tabIds: tabIds });

            const freshColor = await getDistinctColor();
            await chrome.tabGroups.update(groupId, {
              title: targetTitle,
              color: freshColor
            });
          }

          // Apply collapse preference setting to the group
          await chrome.tabGroups.update(groupId, { collapsed: settings.collapseGroups });

        } catch (err) {
          console.error(`[tabehameha] Critical cluster alignment execution failure for host "${host}":`, err);
        }
      }
    }
  }
  console.log("[tabehameha] Cluster sweep pass completed.");
}