const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

export function getNormalizedHost(urlStr, hostAliases) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    if (hostAliases && hostAliases[host]) {
      return hostAliases[host].toLowerCase();
    }
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
  while (i < first.length && first.charAt(i) === last.charAt(i)) {
    i++;
  }
  return first.substring(0, i).trim();
}

export function determineGroupTitle(tabs, domain, minTitleLength) {
  const titles = tabs.map(t => t.title || '');
  const prefix = getLongestCommonPrefix(titles);
  if (prefix && prefix.length >= minTitleLength) {
    return prefix;
  }
  return domain;
}

export async function getDistinctColor() {
  try {
    const existingGroups = await chrome.tabGroups.query({});
    const usedColors = existingGroups.map(g => g.color);
    const colorCounts = {};
    CHROME_COLORS.forEach(c => colorCounts[c] = 0);
    usedColors.forEach(c => {
      if (colorCounts[c] !== undefined) colorCounts[c]++;
    });
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
  const settings = await chrome.storage.sync.get({
    delayMinutes: 60,
    excludeHosts: '',
    hostAliases: '',
    crossWindow: false,
    includePinned: false,
    regroupExisting: false,
    minTitleLength: 7
  });

  const exclusions = settings.excludeHosts
    .split(/[\n,]+/)
    .map(h => h.trim().toLowerCase())
    .filter(h => h.length > 0);

  const aliasesMap = {};
  settings.hostAliases.split(/[\n;]+/).forEach(line => {
    const parts = line.split('->');
    if (parts.length === 2) {
      const aliasPart = parts[0].trim().toLowerCase();
      const targetPart = parts[1].trim().toLowerCase();
      if (aliasPart && targetPart) {
        aliasesMap[aliasPart] = targetPart;
        if (aliasPart.startsWith('www.')) aliasesMap[aliasPart.substring(4)] = targetPart;
        else aliasesMap[`www.${aliasPart}`] = targetPart;
      }
    }
  });

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const cutoffTime = now - (settings.delayMinutes * 60 * 1000);
  const buckets = {};

  tabs.forEach(tab => {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      return;
    }
    if (tab.active) return;
    const lastAccessed = tab.lastAccessed || now;
    if (lastAccessed > cutoffTime) return;
    if (tab.pinned && !settings.includePinned) return;
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !settings.regroupExisting) return;

    const normHost = getNormalizedHost(tab.url, aliasesMap);
    if (!normHost) return;

    const isExcluded = exclusions.some(exc => normHost === exc || normHost.endsWith('.' + exc));
    if (isExcluded) return;

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

        const tabIds = matchingTabs.map(t => t.id);
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
            groupId = await chrome.tabs.group({ tabIds: tabIds, groupId: matchedGroup.id });
          } else {
            groupId = await chrome.tabs.group({ tabIds: tabIds, windowId: winKey === 'global' ? undefined : parseInt(winKey) });
            const freshColor = await getDistinctColor();
            await chrome.tabGroups.update(groupId, {
              title: targetTitle,
              color: freshColor
            });
          }
        } catch (err) {
          console.error("Engine failure:", err);
        }
      }
    }
  }
}
