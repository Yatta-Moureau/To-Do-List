# Our Time

<p align="center">
  <img src="icons/our time icon.png" alt="Our Time" width="120" height="120">
</p>

A modern, tactical-themed personal productivity dashboard.
Self-contained, offline-first, installable as a PWA.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](#)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white)](#)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)](#)

---

## Features

### Core Widgets
| Feature | Description |
|---------|-------------|
| **Live Clock & Greeting** | Time-based greeting, live HH:MM:SS with AM/PM, full date |
| **Focus Timer** | Configurable Pomodoro (1-120 min), segmented progress bar |
| **Task Manager** | HIGH/MED/LOW priority, inline editing, purge completed |
| **Quick Links** | Add label + URL, opens new tab, localStorage |
| **Alarm System** | once/daily/weekdays/weekends, snooze/dismiss, overlay alert |
| **Sound Library** | Upload 5 sounds (MP3/WAV/OGG, 5MB each), play/stop/rename |

### Visual & UX
| Feature | Description |
|---------|-------------|
| **Dark/Light Theme** | Tactical dark + clean light, toggle, persists |
| **Theme Customizer** | 6 presets + 6 custom color pickers |
| **Bouncing Images** | 5 images with particle trails, bounce, rotation |
| **Profile Photo** | Click-to-upload circular photo |
| **Clear View Mode** | Hides cards, shows only floating images |
| **Interaction Sounds** | Web Audio API synthesized SFX |
| **Smooth Transitions** | 0.4s ease theme transitions |

### Progressive Web App
| Feature | Description |
|---------|-------------|
| **Installable** | Home screen with custom icon, standalone mode |
| **Offline-First** | Full functionality without network |
| **Auto-Update** | Detects new versions, prompts to refresh |
| **Download Button** | Navbar install button when available |
| **Dynamic Theme Color** | Status bar syncs with theme |

### Data & Security
| Feature | Description |
|---------|-------------|
| **Data Backup/Restore** | Export/import all data as JSON |
| **CSP** | Blocks XSS and inline script injection |
| **Input Validation** | Length, format, MIME, URL scheme checks |
| **XSS Prevention** | javascript:/data:/vbscript: blocked |

---

## Quick Start

### Open Directly
Open index.html in any modern browser.

> **Note:** Service workers require a server (HTTPS or localhost). Use a local server for full PWA features.

### Local Server


### Install as PWA
1. Open in Chrome/Edge via local server
2. Click the **download icon** in the navbar
3. App installs to home screen / desktop
4. Works offline after first visit

---

## Project Structure



---

## Architecture

| Module | Responsibility |
|--------|---------------|
| StorageService | localStorage abstraction |
| SFXModule | Web Audio API interaction sounds |
| AlarmAudio | Alarm sound generator |
| SoundModule | Multi-sound library (IndexedDB) |
| ThemeModule | Dark/light theme switching |
| GreetingModule | Clock, greeting, stats |
| TimerModule | Pomodoro timer |
| TodoModule | Task CRUD with priority |
| LinksModule | Quick links modal |
| AlarmSystem | Alarm scheduling |
| AlarmUI | Alarm overlay, snooze/dismiss |
| SettingsModule | Settings, data backup |
| BounceImages | Floating images (IndexedDB) |
| ThemeCustomizer | Color presets + CSS sync |
| ToastModule | Toast notifications |
| KeyboardModule | Global hotkeys |
| ProfilePhotoModule | Profile photo upload |
| ClearViewModule | Clear view mode |
| PWAModule | Service worker, install/update |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Stop focus timer |
| N | Focus task input |
| L | Open Add Link modal |
| S | Open Settings |
| Esc | Close any modal/panel |

---

## PWA Details

### Service Worker Strategies
| Request | Strategy |
|---------|----------|
| Navigation | Network-first, cache fallback |
| Static assets | Cache-first + revalidate |
| Google Fonts | Stale-while-revalidate |
| blob:/data: | Pass-through |

### Cache Versioning
- Current: our-time-v1
- Bump CACHE_NAME in sw.js to trigger update

### How to Test
1. Install: Chrome -> download icon -> installs
2. Offline: DevTools -> Application -> Offline -> reload
3. Update: Change CACHE_NAME -> reload -> toast -> refresh
4. Lighthouse: PWA audit should pass all checks

---

## Security

- CSP: default-src self + Google Fonts allowlist
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- URL validation: javascript:/data:/vbscript: blocked
- textContent only (no innerHTML with user data)
- File validation: MIME + extension + size
- IndexedDB for large binary data
- Service worker only intercepts http/https

---

## Testing



| Suite | Tests |
|-------|-------|
| dashboard.test.js | 16 |
| theme.test.js | 6 |
| Browser tests | 36 |

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome | Full PWA |
| Firefox | Full support |
| Edge | Full PWA |
| Safari | PWA (iOS 16.4+) |

Responsive from 320px to 2560px.

---

## Data Storage

| Data | Storage | Key |
|------|---------|-----|
| Theme | localStorage | pd_theme |
| Name | localStorage | pd_user_name |
| Duration | localStorage | pd_pomodoro_duration |
| Tasks | localStorage | pd_todos |
| Links | localStorage | pd_links |
| Alarms | localStorage | pd_alarms |
| Custom theme | localStorage | pd_custom_theme |
| Bounce | localStorage | pd_bounce_* |
| SFX | localStorage | pd_sfx_enabled |
| Photo | localStorage | pd_profile_photo |
| Bounce images | IndexedDB | OurTimeBounceDB |
| Sounds | localStorage | pd_sound_library |
| SW Cache | Cache API | our-time-v1 |

---

## License

MIT License

Copyright (c) 2026 Yatta-Moureau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
---

*Built with vanilla HTML, CSS, and JavaScript. No frameworks. No build tools.*
