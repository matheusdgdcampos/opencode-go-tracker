<p align="center">
  <strong>🇺🇸 English</strong> • <a href="README.pt-BR.md">🇧🇷 Leia em Português</a>
</p>

<p align="center">
  <img src="resources/app_icon.png" width="128" height="128" alt="OpenCode Go Tracker Logo" />
</p>

<h1 align="center">OpenCode Go Tracker</h1>

<p align="center">
  <strong>Cross-platform menu bar & system tray utility for real-time monitoring of OpenCode Go usage quotas.</strong>
</p>

<p align="center">
  <a href="#-testing-and-coverage"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions" alt="Build Status" /></a>
  <a href="#-testing-and-coverage"><img src="https://img.shields.io/badge/tests-92%20passed-brightgreen?style=flat-square&logo=vitest" alt="Tests" /></a>
  <a href="#-testing-and-coverage"><img src="https://img.shields.io/badge/coverage-%3E90%25-brightgreen?style=flat-square" alt="Coverage" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/electron-v34-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-v5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/react-v19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="#-about-the-project">About</a> •
  <a href="#-features">Features</a> •
  <a href="#-privacy--security-model">Privacy</a> •
  <a href="#-interface-states">UI States</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-developer-guide">Development</a> •
  <a href="#-testing-and-coverage">Testing & Coverage</a> •
  <a href="#-credentials--troubleshooting">Credentials</a>
</p>

---

## 📖 About the Project

**OpenCode Go Tracker** is a sleek, lightweight background utility designed exclusively for your operating system's menu bar or system tray (macOS Menu Bar, Windows System Tray, and Linux StatusNotifierItem).

Built specifically for [OpenCode Go](https://opencode.ai) subscribers, it prevents quota exhaustion surprises during AI coding sessions by providing instant visibility into your remaining quotas and countdown timers to the next reset—without opening a browser or running manual commands.

Faithfully ported from the native Swift/AppKit version to **Electron + React + TypeScript**, it preserves 100% of Clean Architecture principles, strict in-memory isolation, and a zero-disk footprint.

---

## 🚀 Features

- **Tray-Only Presence:** Never clutters your macOS Dock or Windows/Linux taskbar. The popup window opens smoothly anchored to the tray icon and dismisses automatically on blur (*hide-on-blur* with anti-flicker protection).
- **Three Independent Quota Windows:**
  - ⏱️ **5-Hour (Rolling Window):** Immediate rolling usage window, reflected directly in the tray label with percentage consumed (`>_ 42%`).
  - 📅 **Weekly Window:** Cumulative weekly quota tracking.
  - 📆 **Monthly Window:** Total billing cycle quota tracking.
- **Semantic Color Thresholds:**
  - 🟢 **Normal (`< 50%`):** Calm Green (`#30D158`).
  - 🟡 **Warning (`50% – 79%`):** Alert Yellow (`#FFD60A`).
  - 🔴 **Critical (`≥ 80%`):** Urgent Red (`#FF453A`).
- **Real-Time Client-Side Countdown:** Automatically recalculated every minute locally (`Resets in 3h 05m`), keeping timers fresh without overloading the API with unnecessary requests.
- **Visual Resilience (*Stale-While-Revalidate*):** Transient network drops or API hiccups preserve the last known valid metrics on screen rather than showing disruptive error screens.
- **Automatic Localization (i18n):** Automatically detects system language (`en-US` or `pt-BR`) with seamless fallbacks.

---

## 🔒 Privacy & Security Model

Designed from the ground up under the **Zero Residue / Zero Footprint** principle:

1. **No Database or Local Config Files:** The application never writes configuration, history, or tokens to disk.
2. **Ephemeral Memory Storage:** If an API key is manually entered in the UI, it is held strictly in volatile RAM within the main process and destroyed when the app exits.
3. **Safe Read-Only Credential Access:** Automatically reads credentials directly from the official OpenCode CLI path (`~/.local/share/opencode/auth.json`) in read-only mode, seamlessly detecting token rotations on every polling cycle (60s).
4. **Isolated Cache & Storage:** Electron's `userData` path is redirected dynamically to the OS temporary directory (`$TMPDIR`) before app initialization.
5. **Hardened Preload Bridge:** `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`. The raw API token is never exposed to the renderer context.

---

## 🖥️ Interface States

The popup renders a focused, context-aware interface matching the current connection state:

| State | Icon / Indicator | Visual Description | Available Actions |
| :--- | :--- | :--- | :--- |
| **Loaded** | 📊 3 Quota Bars | Color-coded progress bars with percentage and reset countdown | Refresh quota, Quit |
| **Loading** | ⏳ Polished Spinner | Synchronizing data with API (preserves stale data if available) | Quit |
| **No Key** | 🔑 Key Input Field | Guides user to run `/connect` or paste API token into memory | Submit key, Quit |
| **Invalid Key** | ⚠️ Yellow Alert | Explains that the key is invalid or the subscription has expired | Retry, Quit |
| **Network Error** | 🌐 Offline Warning | Indicates network drop and schedules automatic retry in 60s | Retry now, Quit |
| **Unexpected Response** | 🛑 Error Shield | Gracefully handles unexpected schema changes or upstream failures | Retry now, Quit |

---

## 🏗️ Architecture

The codebase strictly follows **Clean Architecture** and **Dependency Inversion (DIP)**:

```text
opencode-go-tracker/
├── assets/                       # Vector and raster tray icon assets (16x16, 32x32@2x)
├── resources/                    # Official application logo and icons (app_icon.png)
└── src/
    ├── core/                     # ⚙️ Pure Domain & Business Logic (UI & Electron agnostic)
    │   ├── models.ts             # Strict quota decoding & ISO-8601 parsing
    │   ├── formatter.ts          # BarLevel calculations & timeRemaining formatting
    │   ├── fileSystem.ts         # I/O abstraction over fs, os, and path
    │   ├── authKeyReader.ts      # Secure auth.json reader with DI support
    │   ├── usageService.ts       # Finite state machine & 60s polling scheduler
    │   ├── strings.ts            # i18n dictionaries & locale resolution
    │   ├── utils.ts              # Math clamping, safe parsing, and type guards
    │   └── *.test.ts             # Comprehensive domain unit tests
    ├── main/                     # 🖥️ Electron Main Process (Node.js)
    │   ├── index.ts              # Lifecycle, single-instance lock, orchestration
    │   ├── popupWindow.ts        # Popup window with screen boundary clamping
    │   ├── trayController.ts     # Native tray controller (macOS title / Win/Linux canvas)
    │   ├── appPaths.ts           # Ephemeral temp userData isolation
    │   └── ipc.ts                # Strongly-typed IPC handlers & state broadcast
    ├── preload/                  # 🛡️ Secure Preload Bridge (contextBridge)
    │   ├── index.ts              # Strict RPC contract exposed via window.api
    │   └── index.d.ts            # Global TypeScript definitions for renderer
    └── renderer/                 # ⚛️ User Interface (React 19 + TypeScript)
        ├── App.tsx               # State-driven popup view
        ├── QuotaBar.tsx          # Reusable semantic progress bar component
        ├── trayLabel.ts          # Offscreen canvas badge generation (Win/Linux)
        └── styles.css            # Dark mode styling (#1F1F24)
```

---

## 🛠️ Developer Guide

### Prerequisites
- **Node.js:** v20.0.0 or higher.
- **npm:** v10.0.0 or higher.

### Installation
```bash
npm install
```

### Development Mode
Launch the application with Hot Module Replacement (HMR) and live reload:
```bash
npm run dev
```

### TypeScript Type Checking
Validates strict type safety across Node/Main and DOM/Web environments:
```bash
npm run typecheck
```

### Production Build
Compiles and bundles optimized assets into `out/`:
```bash
npm run build
```

### Packaging Installers
Build native packages for your target operating system:
```bash
# macOS (Universal/arm64/x64 DMG)
npm run dist:mac

# Windows (NSIS Installer)
npm run dist:win

# Linux (AppImage)
npm run dist:linux
```

---

## 🧪 Testing and Coverage

The automated test suite runs on [Vitest](https://vitest.dev) with native [V8 Coverage](https://v8.dev):

### Run Unit Tests
```bash
npm test
```

### Run Tests with Coverage (≥ 80% Threshold)
Generates detailed terminal tables, HTML reports, and LCOV output in `coverage/`:
```bash
npm run test:coverage
```

### Current Coverage Metrics
| Metric | Current Coverage | Project Target | Status |
| :--- | :---: | :---: | :---: |
| **Lines (% Lines)** | **90.83%** | ≥ 80.00% | ✅ Passed |
| **Statements (% Stmts)** | **90.83%** | ≥ 80.00% | ✅ Passed |
| **Functions (% Funcs)** | **92.30%** | ≥ 80.00% | ✅ Passed |
| **Branches (% Branch)** | **86.64%** | ≥ 80.00% | ✅ Passed |

---

## 🔍 Credentials & Troubleshooting

### Where does OpenCode store credentials?
By default, the OpenCode CLI stores authentication tokens at:
- **macOS / Linux:** `~/.local/share/opencode/auth.json` (or `$XDG_DATA_HOME/opencode/auth.json`)
- **Windows:** `%LOCALAPPDATA%\opencode\auth.json`

The file schema is:
```json
{
  "opencode-go": {
    "type": "api",
    "key": "sk-your-api-key-here"
  }
}
```

### Key Not Detected in the App?
1. **Terminal Login:** Open your terminal and log in via the official CLI:
   ```bash
   opencode providers login --provider opencode-go
   ```
   Paste your API key when prompted. The tracker will automatically discover the credentials on the next polling cycle (or click the refresh button).
2. **Direct Manual Input:** Paste your API key directly into the application window—it will be stored safely in memory for the duration of the session.
3. **Environment Variable:** The OpenCode CLI also respects the `OPENCODE_API_KEY` shell environment variable.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
