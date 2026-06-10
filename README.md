# ☄️ tabehameha (タベハメハ)
[Hackaton2026] an extension for Chrome to manipulate and manage the open tabs of the browser

`tabehameha` is a zero-friction, automated browser extension engineered to eradicate tab clutter and optimize local machine memory. Rather than forcing a binary choice between losing context or sacrificing system performance, `tabehameha` implements a continuous optimization lifecycle. It handles everything from soft context grouping to aggressive RAM-purging dormancy pipelines.

---

## 🚀 Core Features & Use Cases

### 1. Active Workspace Clustering (Standard Grouping)
* **What it does:** Automatically rounds up scattered, idle tabs from the same domain name and organizes them into native Chromium Tab Groups with clean titles and distinct, non-conflicting colors.
* **Use Case:** You are doing holiday research on Expedia, reading code docs on GitHub, and checking sports scores on ESPN. Instead of a single messy row of 40 tiny tab stamps, `tabehameha` groups your workspace into three distinct, collapsed pods labeled `expedia.com`, `github.com`, and `espn.com`.
* **Example:** 5 distinct tabs open to `github.com/user/repo/issues/...` are consolidated cleanly under an auto-generated, collapsed group block.

### 2. The Hybrid Dormancy Engine (Idea #4)
* **What it does:** Shifts optimization away from rigid, hard-termination tab closing. When a tab crosses the deep dormancy threshold, the extension triggers a multi-tier action depending on your chosen performance profile.
* **Use Case:** You leave 15 heavy documentation frames open overnight. Rather than losing them entirely or waking up to a crippled laptop with fans spinning at full speed, the native sleep engine steps in.
* **Example Profiles:**
  * **Native Sleep Mode:** Triggers low-level V8 process discarding. The tab remains visible inside its tab group row, but its physical memory allocation drops to **0 MB**. Clicking the tab instantly re-hydrates it.
  * **Hard Archival Vault Mode:** Closes the inactive tabs entirely to clear visual clutter, serializing their titles, URLs, and icons into a local recovery stack accessible via the popup UI dashboard.

### 3. Smart Common-Prefix Naming
* **What it does:** Instead of blindly naming a group after a bare domain string (like `amazon.com`), the engine evaluates string arrays to find the Longest Common Prefix (LCP) among the page titles.
* **Use Case:** You have multiple tabs open for a specific project tracker or unique search.
* **Example:** If three tabs are titled `"Project Alpha - Tasks"`, `"Project Alpha - Timeline"`, and `"Project Alpha - Burndown"`, the extension bypasses the generic domain name and names the cluster **`Project Alpha -`**.

### 4. Custom Routing Aliases & Safeguards
* **What it does:** Allows you to map separate subdomains or distinct tools into unified, single target groups while guaranteeing that critical communication web apps are never touched.
* **Use Case:** Merging corporate systems (`jira.company.com` and `confluence.company.com`) into a single group called `company-work`, while protecting real-time apps like Slack or Gmail from being grouped or slept.

---

## ⚙️ Configuration Options & System Impact

Through the extension options page, you can fully adjust how aggressively `tabehameha` manages your system resources:

| Option Setting | Interface Control | Operational Impact |
| :--- | :--- | :--- |
| **Deep Dormancy Strategy Engine Mode** | Dropdown Selector | Controls the extreme dormancy pipeline. Set to **Disabled** (no action), **Native Sleep Mode** (purges RAM but leaves the tab visible), or **Hard Archival Vault Mode** (closes the tab and backs up metadata to the local recovery stack). |
| **Standard Grouping Inactivity Threshold** | Digit Input + Unit Selector (Sec/Min/Hr/Days) | The minimum length of time a tab must sit untouched before the clustering cycle treats it as idle and auto-groups it. |
| **Deep Dormancy Inactivity Trigger Line** | Digit Input + Unit Selector (Sec/Min/Hr/Days) | The second-stage deadline. Tabs that are idle longer than this value are handed over to the chosen Sleep or Hard Archival strategy engines. |
| **Excluded Hosts / Domains** | Multi-line Text Area | A comma-separated blocklist of absolute domains or subdomains. Any tab matching this list is ignored by the grouping, sleeping, and archiving loops. |
| **Custom Domain Rule Aliases** | Multi-line Text Area | Maps custom configurations using a `source -> destination` syntax. Ideal for consolidating multiple sprawling enterprise services into one unified folder. |
| **Consolidate matches across windows** | Toggle Checkbox | When enabled, the engine searches all open browser windows to form logical tab groups, gathering scattered tabs into a single window destination. |
| **Include pinned tabs in calculations** | Toggle Checkbox | When disabled, pinned tabs are treated as permanent infrastructure and are ignored. Turning this on subjects pinned tabs to grouping and resource management. |
| **Re-evaluate and modify tabs inside groups** | Toggle Checkbox | If disabled, tabs that have already been manual grouped are left untouched. If enabled, the engine will pull them out and re-group them based on recent idle patterns. |
| **Automatically collapse generated groups** | Toggle Checkbox | Dictates visual presentation. Automatically collapses newly generated groups to keep the tab bar clean and compact. |
| **Minimum Common Title Prefix Length** | Digit Input (Min: 3) | The minimum character length required for a common title prefix to override the default domain name when naming a group. |

---

## 🛠️ Technical Architecture & Engineering Choices

```
   [ Browser Tab Strip ] <----------------------------------------+
             |                                                    |
     (Query via Filters)                                          |
             v                                                    |
  +----------------------+                                        |
  |   blastTabClutter()  |                                        |
  +----------------------+                                        |
             |                                                    |
    [ Evaluates Tiers ]                                           |
     /              \                                             |
    /                \                                            |

(Passed Group Cutoff)  (Passed Vault Cutoff)                          |
/                    \                                          |
v                      v                                         |
+-------------------+   +---------------------------------------+     |
|  standardBuckets  |   | dormancyMode Selection                |     |
+-------------------+   +---------------------------------------+     |
|                 /                  \                        |
|                /                    \                       |
|         ['sleep']                ['archive']                |
|              /                        \                     |
|             v                          v                    |
|     +--------------------+     +--------------------+       |
|     | chrome.tabs.discard|     | Push to vaultStack |       |
|     +--------------------+     | chrome.tabs.remove |       |
|              |                 +--------------------+       |
v              v                                              |
+----------------------------------------+                           |
| Robust Verification Loop               |                           |
| (Syncs runtime IDs, strips dead tabs)  |                           |
+----------------------------------------+                           |
|                                                    |
+--- (Batched API Execution: chrome.tabs.group) -----+

```

### Architectural Pipeline
1. **State Assessment:** The engine executes a single pass over the entire open tab array, filtering out protected environments (`chrome://`, `about:blank`, active items, and custom blocklists).
2. **The Two-Stage Window Filter:** 
   * It calculates an individual idle time for each tab ($T_{\text{idle}} = T_{\text{now}} - T_{\text{lastAccessed}}$).
   * If $T_{\text{idle}} \ge \text{Vault Threshold}$, the tab enters the **Deep Dormancy Strategy** path.
   * If $\text{Group Threshold} \le T_{\text{idle}} < \text{Vault Threshold}$, the tab flows directly into the **Active Workspace Clustering** domain bucketing system.
3. **The Micro-Task Lifecycle Strategy:** When operating under `sleep` mode, tabs are first natively discarded to reclaim RAM, but they are *intentionally allowed to drop down into the standard grouping block* so they are organized cleanly by domain.

---

### Key Technical Engineering Challenges & Innovations

#### 1. The Post-Discard Tab ID Race Condition Fix
A major hurdle when working with the native `chrome.tabs.discard()` API is its asynchronous behavior under the hood. When Chromium discards a tab to free memory, it terminates the existing tab process and immediately instantiates a proxy tab entity. 

In early versions, trying to run `chrome.tabs.discard()` and `chrome.tabs.group()` back-to-back using the same scoped dataset caused frequent crashes:
```text
Group execution failure: Error: No tab with id: 163176401.

```

**Our Solution:** The architecture implements a **Dynamic Re-Verification/Look-Up Loop** right before calling the grouping API. The engine intercepts the original tab list and runs a quick `chrome.tabs.get(id)` query. Any stale tab IDs are safely weeded out or refreshed, preventing unhandled runtime exceptions from breaking the background worker process.

#### 2. Guardrails Against Discard Spam Error Loops

Chromium will throw a loud engine-level error if an extension attempts to call `chrome.tabs.discard()` on an asset that is already asleep, completely blank, or actively streaming background audio.

**Our Solution:** The engine inspects the boolean `tab.discarded` state before executing any memory-freeing commands. If a tab is already asleep, the operation is skipped, eliminating error noise in the developer console.

#### 3. Intelligent Storage Limits via First-In, First-Out (FIFO) Stacks

To prevent local memory leaks from unconstrained growth in **Hard Archival Vault Mode**, the local metadata serialization array (`vaultStack`) acts as a strict FIFO ring buffer capped at a maximum ceiling of **500 items**. This guarantees that storage access times remain fast and responsive.

---

## 📦 Installation & Development Setup

1. Clone or download this project repository to your local computer.
2. Open Google Chrome (or any Chromium-based browser) and navigate to `chrome://extensions/`.
3. Enable the **Developer mode** toggle switch in the upper right-hand corner.
4. Click the **Load unpacked** button in the top left, select the root project directory containing the `manifest.json` file, and press open.

---

## Demo:

Tabehameha demo:
* 1: https://youtu.be/CKbfzsscoXo
* 2: https://youtu.be/ibE_iEoEk6s
* 3: https://youtu.be/fAjqnqjl_aI
* Playlist: https://www.youtube.com/playlist?list=PLaEoX1O9ctgs

Backup:
* 1: https://youtu.be/GWcSg8-KjVA
* 2: https://youtu.be/YjORoWc89Zg
* 3: https://youtu.be/lZXmXs22hUE

Loom:
* 1: https://www.loom.com/share/87e18c22b8e64e0b84e1c19c6d886af4
* 2: https://www.loom.com/share/bd6e2832a4724a83a4ddf53736b4eacf
* 3: https://www.loom.com/share/42d480ea8b514c689f1bab484420b94e