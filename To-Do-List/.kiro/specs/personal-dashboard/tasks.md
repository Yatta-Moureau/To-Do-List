# Implementation Plan: Personal Dashboard

## Overview

Build a zero-dependency, single-page personal dashboard using HTML5, CSS3, and Vanilla JavaScript. All logic lives in three files (`index.html`, `css/style.css`, `js/app.js`). The implementation proceeds module-by-module, with property-based tests (fast-check) covering all 12 design correctness properties. Each task builds incrementally on the previous steps and ends with all code wired into the running application.

---

## Tasks

- [x] 1. Project scaffolding — create the three required files and baseline structure
  - Create `index.html` at the project root with a valid HTML5 doctype, `<head>` (charset, viewport meta, CSS link), and a `<body>` that includes a placeholder comment for each widget area and a `<script src="js/app.js" defer>` tag
  - Create `css/style.css` inside a `css/` directory with an empty ruleset and a reset block (`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`)
  - Create `js/app.js` inside a `js/` directory with a top-level IIFE skeleton: `(function() { 'use strict'; /* modules */ })();`
  - Confirm no external `<script>` or `<link>` tags reference CDN or external URLs
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 2. StorageService — localStorage wrapper
  - [x] 2.1 Implement `StorageService` object with `get(key)`, `set(key, value)`, and `remove(key)` methods inside the IIFE
    - Each method wraps its `localStorage` call in a try/catch
    - `get` returns the parsed JSON value or `null` on error/missing
    - `set` JSON-stringifies the value; returns `true` on success, `false` on failure
    - `remove` returns `true` on success, `false` on failure
    - Define all `pd_*` key constants (`KEY_THEME`, `KEY_NAME`, `KEY_POMODORO_DURATION`, `KEY_TODOS`, `KEY_LINKS`) as frozen properties on `StorageService`
    - _Requirements: 2.7, 4.2, 5.7, 6.7, 6.11, 6.14, 8.11, 8.12_

  - [ ] 2.2 Write property test for StorageService round-trip persistence
    - Set up a fast-check test file (e.g., `tests/storage.test.js`) and install fast-check as a dev dependency
    - **Property 7: Task persistence round-trip** — for any valid array of task objects, `StorageService.set('pd_todos', tasks)` followed by `StorageService.get('pd_todos')` SHALL return a deeply equal array
    - **Property 12: Links persistence round-trip** — for any valid array of Quick_Link objects, serialize then read back and expect deep equality
    - Mock `localStorage` using an in-memory map to keep tests environment-independent
    - **Validates: Requirements 5.2, 5.6, 6.5, 8.4, 8.10**

- [ ] 3. Theme flash prevention + ThemeModule
  - [x] 3.1 Add inline theme-bootstrap script to `<head>` in `index.html`
    - Place a `<script>` tag immediately after the CSS `<link>` (before `</head>`) containing a self-invoking function that reads `localStorage.getItem('pd_theme')` and calls `document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light')`, falling back to `'light'` on any exception
    - This must complete synchronously before the browser paints; no `defer` or `async`
    - _Requirements: 9.5, 9.6, 9.7_

  - [x] 3.2 Implement `ThemeModule` inside `app.js`
    - `init()`: reads saved theme from `StorageService`, applies `data-theme` attribute to `<html>`, updates toggle button icon/label
    - `toggle()`: reads current theme, flips it, writes to storage via `StorageService`, updates `data-theme` and toggle UI
    - Wire the theme toggle button (`#theme-toggle`) click handler to `ThemeModule.toggle()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

  - [ ] 3.3 Write property test for theme toggle invertibility
    - **Property 11: Theme toggle is its own inverse** — calling `toggle()` twice SHALL restore the original theme value
    - Use fast-check to generate either `"light"` or `"dark"` as the starting theme and assert the two-call invariant
    - **Validates: Requirements 9.2**

  - [ ] 3.4 Implement CSS custom property theming in `style.css`
    - Define `:root` with all light-palette variables (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-border`, `--color-error`, `--color-success`, etc.)
    - Add `[data-theme="dark"]` block overriding those variables with the dark palette
    - Verify that a single attribute flip on `<html>` causes a full re-paint; all widget selectors must consume only `var(--*)` tokens
    - _Requirements: 9.3, 11.2_

- [ ] 4. GreetingModule — clock, date, and greeting text
  - [ ] 4.1 Implement pure helper functions for GreetingModule
    - `getGreeting(hour)` — maps integer 0–23 to one of four greeting strings using the exact hour boundaries from the design
    - `formatTime(date)` — returns `HH:MM` (24-hour, zero-padded)
    - `formatDate(date)` — returns full weekday, day (no leading zero), full month, 4-digit year
    - Export / expose these as testable symbols (module pattern or assignment to a `_testExports` object on the IIFE)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 4.2 Write property tests for greeting and time formatting
    - **Property 1: Greeting text correctness** — for any integer in 0–23 generated by fast-check, `getGreeting(hour)` returns the correct greeting string for that hour's range and never returns an unlisted string
    - **Property 3: Timer format correctness** — for any integer in 0–5940, `formatMMSS(n)` returns a string matching `/^\d{2}:\d{2}$/` with the seconds component between 00 and 59 (add `formatMMSS` stub here for early validation; full implementation in Task 5)
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 3.1, 3.3**

  - [ ] 4.3 Implement `GreetingModule.init()` and `render()` inside `app.js`
    - `render()` reads `USER_NAME` from `StorageService`, calls `getGreeting`, `formatTime`, `formatDate`, and updates the Greeting_Widget DOM elements (`#greeting-time`, `#greeting-date`, `#greeting-text`)
    - `init()` calls `render()` immediately, then schedules the next tick to fire at the top of the next minute using `setTimeout` (align to minute boundary) + `setInterval(render, 60000)` thereafter
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 1.9_

  - [ ] 4.4 Write property test for greeting-with-name round-trip
    - **Property 2: Greeting with name round-trip** — for any non-empty string of at most 50 characters generated by fast-check, saving the name and calling `render()` SHALL produce a greeting string ending with `, {name}`
    - Mock the DOM update functions and `StorageService.get` to test the composition
    - **Validates: Requirements 1.7, 2.3**

- [ ] 5. TimerModule — countdown state machine and notifications
  - [ ] 5.1 Implement `formatMMSS(totalSeconds)` pure function
    - Returns `"MM:SS"` for any integer 0–5940; zero-pads both components
    - Attach to `_testExports`
    - _Requirements: 3.1, 3.3_

  - [ ] 5.2 Implement `TimerModule` state machine inside `app.js`
    - Internal state: `{ state: 'IDLE'|'RUNNING'|'PAUSED', remainingSeconds, durationMinutes, intervalId }`
    - `init()`: reads `pd_pomodoro_duration` from `StorageService` (default 25; validate range 1–120); sets `remainingSeconds`; renders display; wires Start/Stop/Reset button clicks; requests `Notification.permission` on first Start click
    - `start()`: calls `setInterval(tick, 1000)`, transitions to `RUNNING`
    - `stop()`: calls `clearInterval`, transitions to `PAUSED`
    - `reset()`: calls `clearInterval`, reads `durationMinutes`, resets `remainingSeconds`, transitions to `IDLE`, updates display
    - `tick()`: decrements `remainingSeconds`; calls `complete()` when 0
    - `complete()`: clears interval, shows in-widget alert (`#timer-alert`), fires `new Notification('Pomodoro complete!')` if permission granted
    - `updateDuration(minutes)`: updates `durationMinutes`; if `IDLE`, also resets display
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.3, 4.4, 4.6_

- [ ] 6. Checkpoint — core modules wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. TodoModule — task CRUD, validation, and sort
  - [x] 7.1 Implement pure validation and sort helpers for TodoModule
    - `isEmptyText(text)` — returns `true` if `text.trim().length === 0`
    - `isDuplicate(text, tasks)` — returns `true` if any task in `tasks` matches `text` case-insensitively
    - `generateId()` — returns `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - `getSortedTasks(tasks, sortOption)` — returns a sorted copy for `'default'`, `'alpha-asc'`, `'completed-last'`; tiebreaker is always `createdAt` ascending; does NOT mutate the original array
    - Attach all four to `_testExports`
    - _Requirements: 5.2, 5.3, 5.4, 7.2, 7.4_

  - [ ] 7.2 Write property tests for task validation helpers
    - **Property 5: Whitespace-only and empty tasks are rejected** — for any string of whitespace characters, `isEmptyText(text)` SHALL return `true`
    - **Property 6: Duplicate task rejection** — for any non-empty tasks array and any text that matches an existing task case-insensitively, `isDuplicate` SHALL return `true`
    - Use fast-check string arbitraries for both properties
    - **Validates: Requirements 5.3, 5.4**

  - [ ] 7.3 Write property tests for sort helpers
    - **Property 8: Sort preserves all tasks** — for any task array and any valid sort option, `getSortedTasks` returns an array of the same length with the same `id` values
    - **Property 9: Completed-last sort invariant** — for any task array, `getSortedTasks(tasks, 'completed-last')` places all `done === false` tasks before all `done === true` tasks, with `createdAt` ascending as tiebreaker
    - **Validates: Requirements 7.2, 7.4**

  - [ ] 7.4 Implement `TodoModule` CRUD and render inside `app.js`
    - Internal state: `tasks[]` (loaded from `StorageService`), `currentSort` (session-only, default `'default'`)
    - `init()`: loads from storage; on storage failure, renders empty list + inline error (`role="alert"`); renders; wires Add button and Enter-key on input
    - `addTask(text)`: validates with `isEmptyText` and `isDuplicate`; on failure, shows inline error; on success, pushes task object `{ id, text, done: false, createdAt: Date.now() }`, saves via `StorageService`, clears input, re-renders
    - `editTask(id, newText)`: validates non-empty and ≤ 500 chars; on save failure, shows error and retains edit field; on success, updates task, saves, re-renders
    - `toggleComplete(id)`: flips `done`, saves; on storage failure, reverts `done` and shows error
    - `deleteTask(id)`: removes from array, saves; on storage failure, keeps item and shows error
    - `setSort(option)`: sets `currentSort` (session-only), re-renders
    - `render()`: calls `getSortedTasks`, builds `<li>` elements with edit/complete/delete controls
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 7.1, 7.2, 7.3, 7.4_

  - [ ] 7.5 Write property test for task addition
    - **Property 4: Task addition grows the list** — for any valid task list state and any valid task text (non-empty, ≤ 200 chars, not a case-insensitive duplicate), calling `addTask(text)` SHALL increase the task array length by exactly 1
    - Use fast-check to generate task lists and valid text strings
    - **Validates: Requirements 5.2**

- [ ] 8. LinksModule — quick-link CRUD and URL normalization
  - [ ] 8.1 Implement `normalizeUrl(url)` pure function
    - Returns the URL unchanged if it already starts with `http://` or `https://`
    - Otherwise prepends `https://`
    - Attach to `_testExports`
    - _Requirements: 8.7_

  - [ ] 8.2 Write property test for URL normalization
    - **Property 10: URL normalization idempotence** — for any URL already starting with `http://` or `https://`, `normalizeUrl` returns it unchanged; for any URL without either prefix, a single call prepends `https://` and a second call is a no-op
    - Use fast-check `fc.webUrl()` and arbitrary string arbitraries
    - **Validates: Requirements 8.7**

  - [ ] 8.3 Implement `LinksModule` CRUD and render inside `app.js`
    - Internal state: `links[]` (loaded from `StorageService`)
    - `init()`: loads from storage; on failure, renders empty list + inline error; renders; wires Add button
    - `addLink(label, url)`: validates non-empty label ≤ 50 chars and non-empty url ≤ 2048 chars; calls `normalizeUrl`; saves via `StorageService`; on storage failure, shows error and does NOT render the button; on success, pushes link object `{ id, label, url }`, saves, re-renders
    - `deleteLink(id)`: removes from array, saves, re-renders
    - `render()`: builds `<button>` elements (each opens URL in a new tab via `target="_blank" rel="noopener noreferrer"`) and Delete controls
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12_

- [ ] 9. SettingsModule — name and Pomodoro duration configuration
  - [ ] 9.1 Implement `SettingsModule` inside `app.js`
    - `init()`: populates `#settings-name` input from `StorageService.get(KEY_NAME)`; populates `#settings-duration` from `StorageService.get(KEY_POMODORO_DURATION)` (default 25); wires Save buttons and the open/close toggle (`#settings-open`, `#settings-close`)
    - `saveName(value)`: trims value; if > 50 chars, shows inline error in panel and does NOT write to storage; if empty, removes key and calls `GreetingModule.render()`; otherwise saves and calls `GreetingModule.render()`
    - `saveDuration(value)`: parses as integer; if not in range 1–120, shows inline validation error and does NOT write; otherwise saves and calls `TimerModule.updateDuration(parsed)`
    - Settings panel open/close: toggles a CSS class (`settings-panel--open`) on the panel element; when open, traps focus inside (cycle Tab/Shift-Tab within focusable children); close on Escape key
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 10. App.init() — bootstrap and DOMContentLoaded wiring
  - [ ] 10.1 Implement `App.init()` inside `app.js`
    - Call on `DOMContentLoaded`
    - Invocation order: `ThemeModule.init()`, `GreetingModule.init()`, `TimerModule.init()`, `TodoModule.init()`, `LinksModule.init()`, `SettingsModule.init()`
    - _Requirements: 11.1_

- [ ] 11. Checkpoint — full application wired end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Responsive CSS layout (320 px – 2560 px)
  - [ ] 12.1 Implement the full `style.css` layout
    - Header row: theme toggle (left) + settings gear (right)
    - Greeting Widget: full-width banner below header
    - Two-column grid: Timer Widget (left column) + Todo Widget (right column)
    - Quick Links Widget: full-width below the grid
    - Settings panel: fixed overlay, slides in from the right with CSS transition
    - Use CSS Grid / Flexbox with fluid units (`fr`, `%`, `clamp`)
    - Media query at `< 600 px`: collapse two-column grid to single column, stack vertically
    - Verify no horizontal scrollbar or content clipping at 320 px, 768 px, 1280 px, 2560 px
    - _Requirements: 11.3, 11.5_

  - [ ] 12.2 Add widget-level styling, typography, and animation
    - Style all inputs, buttons, todo list items (strikethrough for done), link buttons, timer display (`font-variant-numeric: tabular-nums`)
    - Add `transition: background-color 80ms ease, color 80ms ease` to all elements that consume theme variables (ensures theme switch completes within 100 ms)
    - Ensure all interactive controls have a visible `:focus-visible` ring
    - _Requirements: 9.3, 11.2_

- [ ] 13. Accessibility — ARIA, keyboard navigation, and focus management
  - [ ] 13.1 Audit and annotate semantic HTML in `index.html`
    - Use `<header>`, `<main>`, `<section>` with `aria-labelledby` for each widget
    - Icon-only buttons (theme toggle, settings gear, edit, delete) MUST have `aria-label` attributes
    - Error / warning messages rendered as `<p role="alert">` so screen readers announce them without navigation
    - Completion toggle rendered as `<button aria-pressed="true|false">` or `<input type="checkbox">` with a visible label
    - _Requirements: none explicitly numbered, but see Accessibility Checks in design_

  - [ ] 13.2 Implement focus trap in SettingsModule for the settings panel
    - When the panel opens, move focus to the first focusable element inside it
    - `keydown` listener intercepts Tab and Shift-Tab, cycling focus within the panel's focusable children
    - Escape key closes the panel and returns focus to the settings gear button
    - _Requirements: 2.1, 4.1 — implied by Settings_Panel accessibility design_

- [x] 14. HTML structure for all widgets in `index.html`
  - [x] 14.1 Write the full widget markup in `index.html`
    - Greeting Widget: `<section id="greeting-widget">` containing `<time id="greeting-time">`, `<p id="greeting-date">`, `<p id="greeting-text">`
    - Timer Widget: `<section id="timer-widget">` with `<div id="timer-display">`, `<button id="timer-start">`, `<button id="timer-stop">`, `<button id="timer-reset">`, `<p id="timer-alert" role="alert">`
    - Todo Widget: `<section id="todo-widget">` with add input (`maxlength="200"`), Add button, sort `<select>`, `<ul id="todo-list">`, `<p id="todo-error" role="alert">`
    - Links Widget: `<section id="links-widget">` with label input (`maxlength="50"`), URL input (`maxlength="2048"`), Add button, `<div id="links-list">`, `<p id="links-error" role="alert">`
    - Settings Panel: `<aside id="settings-panel">` with name input (`maxlength="50"`), name error `<p role="alert">`, duration input (number, min=1, max=120, step=1), duration error `<p role="alert">`, Save buttons, close button
    - _Requirements: 10.1, all widget requirements_

- [ ] 15. Final checkpoint — all tests pass, full cross-browser smoke
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the application will still function correctly without them
- All 12 design correctness properties are covered by the `*` test sub-tasks (Properties 1–12)
- Pure functions (`getGreeting`, `formatTime`, `formatDate`, `formatMMSS`, `isEmptyText`, `isDuplicate`, `getSortedTasks`, `normalizeUrl`) MUST be exposed via `_testExports` on the IIFE so fast-check can import and test them without a bundler
- `StorageService` methods in tests should use an in-memory mock of `localStorage` (e.g., a plain object implementing `getItem`, `setItem`, `removeItem`)
- The inline theme-bootstrap `<script>` in `<head>` is intentionally NOT `defer`-ed — it must block rendering to prevent flash
- Cross-browser smoke: open `index.html` via `file://` in Chrome, Firefox, Edge, Safari; confirm all widgets render, no external network requests, no layout overflow at 320 px

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "14.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2", "7.1"] },
    { "id": 3, "tasks": ["3.3", "3.4", "4.1", "7.2", "7.3", "8.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "7.4", "8.2", "8.3"] },
    { "id": 5, "tasks": ["4.4", "5.1"] },
    { "id": 6, "tasks": ["5.2", "7.5"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2", "13.1", "13.2"] }
  ]
}
```
