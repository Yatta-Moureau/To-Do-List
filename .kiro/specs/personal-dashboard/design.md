# Design Document — Personal Dashboard

## Overview

The Personal Dashboard is a self-contained single-page web application that serves as a browser new-tab replacement or standalone productivity page. It is built exclusively with HTML5, CSS3, and Vanilla JavaScript — no frameworks, no build tools, no external CDN dependencies.

The application renders five functional widgets on a single screen:

1. **Greeting_Widget** — Real-time clock, date, and time-contextual greeting
2. **Timer_Widget** — Configurable Pomodoro countdown timer
3. **Todo_Widget** — Persistent task list with add / edit / complete / delete / sort
4. **Links_Widget** — Configurable quick-access link buttons
5. **Settings_Panel** — Overlay for user name and Pomodoro duration configuration

All state is persisted in the browser's `localStorage`. The application must work correctly when opened via a `file://` URI or from a static HTTP server in Chrome, Firefox, Edge, and Safari (latest stable).

### Design Goals

- **Zero dependencies**: every byte of JS and CSS ships in the project's own files.
- **Instant feel**: theme is applied before first paint; all interactions respond within 100 ms.
- **Resilient storage**: every read/write to `localStorage` is wrapped in try/catch; failures surface inline error messages and never crash the app.
- **Accessible**: semantic HTML, ARIA labels, keyboard-navigable controls, sufficient color contrast in both themes.
- **Responsive**: fluid layout from 320 px to 2560 px viewport width.

---

## Architecture

### File Structure

```
project-root/
├── index.html          # Single HTML entry point
├── css/
│   └── style.css       # All styling (variables, themes, layout, widgets)
└── js/
    └── app.js          # All application logic
```

No other files are required or permitted by Requirement 10.

### Execution Model

The application is fully client-side. There is no build step, server, or module bundler. `app.js` is a single IIFE (Immediately Invoked Function Expression) that encapsulates all state and logic, preventing global namespace pollution.

```
┌─────────────────────────────────────────────────────┐
│                     index.html                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  <head>                                      │   │
│  │    <link rel="stylesheet" href="css/style.css│   │
│  │    <script> (inline theme bootstrap) </script│   │  ← theme applied before paint
│  │  </head>                                     │   │
│  │  <body data-theme="light|dark">              │   │
│  │    <!-- Widget markup -->                    │   │
│  │    <script src="js/app.js" defer></script>   │   │
│  │  </body>                                     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Theme Flash Prevention

A small inline `<script>` tag in `<head>` (before any CSS renders) reads the saved theme from `localStorage` and sets `document.documentElement.dataset.theme` (or `<body data-theme>`) synchronously. This must complete in < 50 ms (Requirement 9.5). Because it runs inline before the CSSOM is applied, the browser never paints the wrong theme.

```html
<script>
  (function() {
    try {
      var t = localStorage.getItem('pd_theme');
      document.documentElement.setAttribute(
        'data-theme',
        t === 'dark' ? 'dark' : 'light'
      );
    } catch(e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

CSS then uses `[data-theme="dark"]` attribute selectors to apply the dark palette.

### Module Breakdown inside `app.js`

`app.js` is organized into logical sections (separated by comments) that are loaded top-to-bottom:

| Section | Responsibility |
|---|---|
| `StorageService` | Thin wrapper around `localStorage`; all reads/writes go through here |
| `ThemeModule` | Toggle, persist, and apply theme |
| `GreetingModule` | Clock tick, date format, greeting text computation |
| `TimerModule` | Countdown state machine, `setInterval` management, notifications |
| `TodoModule` | Task CRUD, sort, validation, Storage sync |
| `LinksModule` | Quick-link CRUD, URL normalization, Storage sync |
| `SettingsModule` | Settings panel open/close, name and duration save |
| `App.init()` | Bootstrap — calls `init()` on every module in dependency order |

Each module exposes only a single `init()` function (and event handlers it registers internally). There is no shared mutable global state between modules; all cross-module communication happens via direct function calls or DOM events.

---

## Components and Interfaces

### StorageService

```js
StorageService = {
  get(key)          // → parsed value | null; catches exceptions
  set(key, value)   // → true | false; JSON.stringify, catches exceptions
  remove(key)       // → true | false; catches exceptions
}
```

All modules use `StorageService` exclusively — no direct `localStorage` calls elsewhere.

Storage key constants (all prefixed `pd_` to avoid collisions):

| Constant | Key string |
|---|---|
| `KEY_THEME` | `pd_theme` |
| `KEY_NAME` | `pd_user_name` |
| `KEY_POMODORO_DURATION` | `pd_pomodoro_duration` |
| `KEY_TODOS` | `pd_todos` |
| `KEY_LINKS` | `pd_links` |

### ThemeModule

- `init()`: reads saved theme (default `'light'`), applies `data-theme` attribute to `<html>`, renders toggle icon/label.
- `toggle()`: flips active theme, writes to storage, updates attribute and toggle UI.

### GreetingModule

- `init()`: renders immediately, schedules next tick to fire at the top of the next minute using a combination of `setTimeout` (to align to the minute boundary) + `setInterval` (60 000 ms thereafter).
- `getGreeting(hour)`: pure function — maps hour (0–23) → greeting string.
- `formatTime(date)`: pure function — returns `HH:MM` string (24-hour).
- `formatDate(date)`: pure function — returns full weekday, day (no leading zero), full month, 4-digit year.
- `render()`: reads name from storage, builds greeting string, updates DOM.

Tick alignment logic:

```
now = new Date()
msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
setTimeout(() => { render(); setInterval(render, 60000); }, msUntilNextMinute)
```

### TimerModule

State machine with three states: `IDLE`, `RUNNING`, `PAUSED`.

```
IDLE ──[Start]──► RUNNING ──[Stop]──► PAUSED ──[Start]──► RUNNING
  ▲                  │                   │
  └──────[Reset]─────┘                   │
  └──────────────────[Reset]─────────────┘
  │                  │
  └──[reach 00:00]───┘  (→ IDLE, fires alert + notification)
```

- `init()`: reads `pd_pomodoro_duration`, sets `remainingSeconds`, renders display, wires button clicks.
- `start()`: calls `setInterval(tick, 1000)`, transitions to `RUNNING`.
- `stop()`: calls `clearInterval`, transitions to `PAUSED`.
- `reset()`: calls `clearInterval`, reads current duration from `TimerModule.durationMinutes`, resets `remainingSeconds`, transitions to `IDLE`.
- `tick()`: decrements `remainingSeconds`; if 0, calls `complete()`.
- `complete()`: clears interval, shows in-widget alert, requests browser notification.
- `formatMMSS(totalSeconds)`: pure function — returns `"MM:SS"` string (zero-padded).
- `updateDuration(minutes)`: called by `SettingsModule` when a new duration is saved; updates `durationMinutes`; if `IDLE`, also resets display.

Browser notification is requested via `Notification.requestPermission()` on first Start click, then `new Notification(...)` on completion.

### TodoModule

Internal state: `tasks[]` array (in creation order) + `currentSort` string.

- `init()`: loads from storage, renders.
- `addTask(text)`: validates (non-empty, ≤ 200 chars, no case-insensitive duplicate), creates task object, pushes to array, saves, re-renders.
- `editTask(id, newText)`: validates (non-empty, ≤ 500 chars), updates, saves, re-renders.
- `toggleComplete(id)`: flips `done` flag, saves, re-renders.
- `deleteTask(id)`: removes from array, saves, re-renders.
- `setSort(option)`: updates `currentSort` (session only, not persisted), re-renders.
- `getSortedTasks()`: pure function — returns a sorted copy of `tasks[]` without mutating it.
- `render()`: applies `getSortedTasks()`, builds DOM list.

Validation helpers (pure functions):
- `isEmptyText(text)` — true if `text.trim().length === 0`
- `isDuplicate(text, tasks)` — case-insensitive match against `tasks[].text`

### LinksModule

Internal state: `links[]` array.

- `init()`: loads from storage, renders.
- `addLink(label, url)`: validates (non-empty label ≤ 50 chars, non-empty url ≤ 2048 chars), normalizes URL, saves, re-renders.
- `deleteLink(id)`: removes, saves, re-renders.
- `normalizeUrl(url)`: pure function — prepends `https://` if URL does not start with `http://` or `https://`.
- `render()`: builds button list.

### SettingsModule

- `init()`: populates inputs from storage, wires save and close/open controls.
- `saveName(value)`: validates (≤ 50 chars; empty = clear), saves via `StorageService`, calls `GreetingModule.render()`.
- `saveDuration(value)`: validates (integer 1–120), saves via `StorageService`, calls `TimerModule.updateDuration()`.

### App.init()

Called on `DOMContentLoaded`:

```js
StorageService is stateless — no init needed
ThemeModule.init()
GreetingModule.init()
TimerModule.init()
TodoModule.init()
LinksModule.init()
SettingsModule.init()
```

---

## Data Models

### LocalStorage Schema

All values are JSON-serialized by `StorageService`. Each key is isolated under the `pd_` namespace.

#### `pd_theme`

```
"light" | "dark"
```

Plain string, no wrapper object.

#### `pd_user_name`

```
string   (1–50 chars) | absent
```

Stored as a plain JSON string. Absent means no key is set (not `null`, not `""`).

#### `pd_pomodoro_duration`

```
integer  (1–120)
```

Stored as a JSON number. Missing or invalid → default 25.

#### `pd_todos`

Array of Task objects:

```json
[
  {
    "id":        "string (UUID v4 or timestamp-based unique ID)",
    "text":      "string (1–200 chars for new; up to 500 chars after edit)",
    "done":      false,
    "createdAt": 1720000000000
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Generated at creation, never mutated |
| `text` | string | Task description |
| `done` | boolean | Completion state |
| `createdAt` | number | `Date.now()` at creation; used as sort tiebreaker |

#### `pd_links`

Array of Quick_Link objects:

```json
[
  {
    "id":    "string",
    "label": "string (1–50 chars)",
    "url":   "string (1–2048 chars, always http:// or https://)"
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Generated at creation |
| `label` | string | Button display text |
| `url` | string | Always normalized to absolute URL |

### ID Generation

IDs are generated with a small pure function that combines `Date.now()` and `Math.random()` to guarantee uniqueness within a single browser session without requiring `crypto.randomUUID()` (for compatibility):

```js
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
```

### Sort Algorithm

`getSortedTasks()` returns a sorted copy; original array order (creation order) is never changed.

```
'default'         → stable sort by createdAt ascending (insertion order)
'alpha-asc'       → sort by text.toLowerCase() ascending; tie → createdAt asc
'completed-last'  → sort by done ascending (false < true); tie → createdAt asc
```

All three use a two-key comparator so tiebreaking by `createdAt` is always deterministic (Requirement 7.4).

---

## UI Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Theme Toggle]                              [Settings ⚙]       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GREETING WIDGET                                          │   │
│  │  HH:MM    Weekday, D Month YYYY    Good morning, Name     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────────────┐  ┌────────────────────────────────┐  │
│  │  TIMER WIDGET         │  │  TODO WIDGET                   │  │
│  │  25:00                │  │  [+] Input _____________ [Add] │  │
│  │  [Start] [Stop] [Reset│  │  [Sort ▼]                      │  │
│  └───────────────────────┘  │  ☐ Task 1          [✎] [✕]    │  │
│                              │  ☑ Task 2 ~~done~~ [✎] [✕]   │  │
│  ┌───────────────────────┐  └────────────────────────────────┘  │
│  │  QUICK LINKS WIDGET   │                                        │
│  │  [Label] [URL] [Save] │                                        │
│  │  [Link 1] [Link 2] …  │                                        │
│  └───────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

On narrow viewports (< 600 px) the two-column area collapses to a single column stacking vertically.

### Settings Panel

A modal overlay that slides in from the right (or fades in on mobile). It contains:
- Name input (max 50 chars) + Save button + character count hint
- Pomodoro duration input (number, 1–120) + Save button
- Close button (×)

The panel is toggled via the ⚙ icon in the header. Focus is trapped inside while open for accessibility.

### CSS Architecture

`style.css` uses CSS custom properties (variables) for theming. The root defines the light-mode palette; `[data-theme="dark"]` overrides them.

```css
:root {
  --color-bg:       #f5f5f5;
  --color-surface:  #ffffff;
  --color-text:     #1a1a1a;
  --color-accent:   #4f6ef7;
  --color-border:   #e0e0e0;
  --color-error:    #d32f2f;
  --color-success:  #2e7d32;
  /* ... */
}

[data-theme="dark"] {
  --color-bg:       #121212;
  --color-surface:  #1e1e1e;
  --color-text:     #e0e0e0;
  --color-accent:   #7b9fff;
  --color-border:   #333333;
  /* ... */
}
```

All widgets consume only these variables, so a single attribute flip on `<html>` triggers a full repaint within 100 ms (Requirement 9.3).

---

## Error Handling

Every interaction with `localStorage` is wrapped in a try/catch inside `StorageService`. The pattern for each module:

| Scenario | Behavior |
|---|---|
| Storage unavailable on load | Render empty/default state; show inline widget-level error banner |
| Storage write fails | Show inline error message in affected widget; do NOT update in-memory state to keep UI consistent |
| Storage write fails on completion toggle | Revert UI to previous state (Requirement 6.11) |
| Storage write fails on task delete | Retain task in list (Requirement 6.14) |
| Invalid stored value on load | Use documented default; no error shown to user (silent recovery) |
| Name > 50 chars submitted | Settings panel shows inline error; no storage write |
| Duration out of range | Settings panel shows inline validation error; no storage write |
| Empty task submitted | Todo widget shows inline message; no item added |
| Duplicate task submitted | Todo widget shows inline warning; no item added |
| Empty / invalid quick link | Links widget shows inline validation message |

Error messages are rendered as `<p role="alert" class="error-msg">` elements directly inside the relevant widget so screen readers announce them without page navigation.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting text correctness

*For any* hour value (0–23), `getGreeting(hour)` SHALL return exactly one of `"Good morning"`, `"Good afternoon"`, `"Good evening"`, or `"Good night"`, and the returned string SHALL be consistent with the time range that hour falls in (05–11 → morning, 12–16 → afternoon, 17–20 → evening, all others → night).

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

### Property 2: Greeting with name round-trip

*For any* non-empty User_Name string of at most 50 characters, saving the name to storage and then calling `GreetingModule.render()` SHALL produce a greeting string that ends with `, {name}`.

**Validates: Requirements 1.7, 2.3**

### Property 3: Timer format correctness

*For any* integer `totalSeconds` in the range 0–5 940 (99 minutes × 60), `formatMMSS(totalSeconds)` SHALL return a string matching the pattern `MM:SS` where MM is a zero-padded integer (00–99) and SS is a zero-padded integer (00–59).

**Validates: Requirements 3.1, 3.3**

### Property 4: Task addition grows the list

*For any* task list state and any valid task text (non-empty, ≤ 200 chars, not a case-insensitive duplicate of an existing task), calling `addTask(text)` SHALL increase the task array length by exactly 1.

**Validates: Requirements 5.2**

### Property 5: Whitespace-only and empty tasks are rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), `addTask(text)` SHALL leave the task list unchanged and return a validation error.

**Validates: Requirements 5.4**

### Property 6: Duplicate task rejection

*For any* task list containing at least one task, and any text that matches any existing task text in a case-insensitive comparison, `addTask(text)` SHALL leave the task list unchanged and return a duplicate error.

**Validates: Requirements 5.3**

### Property 7: Task persistence round-trip

*For any* valid array of task objects, serializing the array to storage with `StorageService.set('pd_todos', tasks)` and then reading it back with `StorageService.get('pd_todos')` SHALL return an array deeply equal to the original.

**Validates: Requirements 5.2, 5.6, 6.5**

### Property 8: Sort preserves all tasks

*For any* task list and any valid sort option, `getSortedTasks()` SHALL return an array whose length equals the original task array length and whose elements are the same task objects (same `id` values).

**Validates: Requirements 7.2**

### Property 9: Completed-last sort invariant

*For any* task list, the result of `getSortedTasks('completed-last')` SHALL have all incomplete tasks (`done === false`) appearing before all complete tasks (`done === true`), with ties broken by `createdAt` ascending.

**Validates: Requirements 7.2, 7.4**

### Property 10: URL normalization idempotence

*For any* URL string that already starts with `"http://"` or `"https://"`, calling `normalizeUrl(url)` SHALL return the original string unchanged. *For any* URL string that does NOT start with either prefix, calling `normalizeUrl(url)` SHALL return `"https://" + url`, and calling `normalizeUrl` again on that result SHALL return the same string (idempotent).

**Validates: Requirements 8.7**

### Property 11: Theme toggle is its own inverse

*For any* active theme value (`"light"` or `"dark"`), calling `ThemeModule.toggle()` twice SHALL result in the same theme value that was active before the first call.

**Validates: Requirements 9.2**

### Property 12: Links persistence round-trip

*For any* valid array of Quick_Link objects, serializing to storage and reading back SHALL return an array deeply equal to the original.

**Validates: Requirements 8.4, 8.10**

---

## Testing Strategy

### Dual-Layer Approach

The project uses two complementary test layers:

1. **Unit / example-based tests** — specific scenarios, edge cases, error conditions, and UI integration points
2. **Property-based tests** — universal properties that hold across all valid inputs

### Property-Based Testing

Property-based tests are written using **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript). Each test runs a minimum of **100 iterations** with generated inputs.

Each property test references its design property via a comment tag:
```
// Feature: personal-dashboard, Property N: <property_text>
```

Properties 1–12 above map directly to property-based tests against the pure functions extracted from `app.js`.

The pure functions that must be exported/testable:
- `getGreeting(hour)`
- `formatTime(date)`
- `formatDate(date)`
- `formatMMSS(totalSeconds)`
- `isEmptyText(text)`
- `isDuplicate(text, tasks)`
- `getSortedTasks(tasks, sortOption)`
- `normalizeUrl(url)`
- `StorageService.get` / `StorageService.set` (with mocked `localStorage`)

### Unit / Example-Based Tests

| Area | Tests |
|---|---|
| Greeting render | Correct output for each of the 4 time ranges; name appended; no name; name boundary (50 chars) |
| Timer state machine | Start → tick → stop → resume sequence; reset from all states; completion at 00:00 |
| Todo validation | Add valid task, add empty, add over-length, add duplicate |
| Todo sort | Each sort option with mixed data |
| Links validation | Valid add, empty label, empty URL, over-length, URL normalization |
| Settings validation | Valid name, name over 50 chars, empty name (clear), valid duration, duration out of range |
| Storage failure | All write/read failure paths produce correct inline error messages |
| Theme | Toggle applies `data-theme` attribute, saves to storage; default when no stored value |
| Theme flash prevention | Inline script sets attribute before body renders |

### Integration / Smoke Tests

- Open `index.html` via `file://` in Chrome, Firefox, Edge, Safari — verify all widgets render within 500 ms
- Verify no external network requests are made (DevTools network panel)
- Resize viewport from 320 px to 2560 px — verify no overflow, clipping, or broken layout
- Set theme to dark, reload — verify no flash of light theme
- Add task, reload — verify task persists
- Set custom name, reload — verify name persists in both greeting and settings input

### Accessibility Checks

- All interactive elements have visible focus indicators
- All icon-only buttons have `aria-label` attributes
- Error messages use `role="alert"`
- Settings panel traps focus while open
- Color contrast ratio ≥ 4.5:1 in both themes (WCAG AA)

> **Note:** Full WCAG compliance requires manual testing with assistive technologies (NVDA, VoiceOver, JAWS) and expert accessibility review. Automated checks catch structural issues but cannot replace user testing with AT.
