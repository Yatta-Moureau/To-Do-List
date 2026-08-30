// ============================================================
// Comprehensive Dashboard Test Suite
// Validates: Greeting, Efficiency calculation, Timer, Links, Tasks, Alarms, Sound Loop
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

let dom;
let window;
let _testExports;

beforeEach(() => {
  dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously'
  });
  window = dom.window;

  // Attach mock AudioContext
  window.AudioContext = class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {}
      };
    }
    resume() { return Promise.resolve(); }
  };

  dom.window.eval(appJs);
  _testExports = window._testExports;
});

describe('Pure Helper Functions', () => {
  test('pad2 formats single and double digits correctly', () => {
    expect(_testExports.pad2(0)).toBe('00');
    expect(_testExports.pad2(5)).toBe('05');
    expect(_testExports.pad2(12)).toBe('12');
    expect(_testExports.pad2(59)).toBe('59');
  });

  test('getGreeting returns correct greeting based on hour', () => {
    expect(_testExports.getGreeting(6)).toBe('Good morning');
    expect(_testExports.getGreeting(11)).toBe('Good morning');
    expect(_testExports.getGreeting(12)).toBe('Good afternoon');
    expect(_testExports.getGreeting(15)).toBe('Good afternoon');
    expect(_testExports.getGreeting(17)).toBe('Good evening');
    expect(_testExports.getGreeting(20)).toBe('Good evening');
    expect(_testExports.getGreeting(22)).toBe('Good night');
    expect(_testExports.getGreeting(2)).toBe('Good night');
  });

  test('formatMMSS formats total seconds to MM:SS', () => {
    expect(_testExports.formatMMSS(0)).toBe('00:00');
    expect(_testExports.formatMMSS(65)).toBe('01:05');
    expect(_testExports.formatMMSS(1200)).toBe('20:00');
    expect(_testExports.formatMMSS(1500)).toBe('25:00');
  });

  test('normalizeUrl prepends https:// if protocol is missing', () => {
    expect(_testExports.normalizeUrl('youtube.com')).toBe('https://youtube.com');
    expect(_testExports.normalizeUrl('http://github.com')).toBe('http://github.com');
    expect(_testExports.normalizeUrl('https://mail.google.com')).toBe('https://mail.google.com');
    expect(_testExports.normalizeUrl('')).toBe('');
  });

  test('calculateEfficiency computes correct percentage rating', () => {
    expect(_testExports.calculateEfficiency(1, 5)).toBe(20);
    expect(_testExports.calculateEfficiency(0, 5)).toBe(0);
    expect(_testExports.calculateEfficiency(5, 5)).toBe(100);
    expect(_testExports.calculateEfficiency(2, 4)).toBe(50);
    expect(_testExports.calculateEfficiency(0, 0)).toBe(100);
  });
});

describe('Dashboard DOM & UI Initial State (Empty Defaults & 20min Focus)', () => {
  test('Initial state: descriptions for empty objectives and quicklinks are empty', () => {
    const statsEl = window.document.getElementById('banner-stats');
    expect(statsEl.textContent).toBe('');

    const progressEl = window.document.getElementById('tasks-progress-text');
    expect(progressEl.textContent).toBe('');

    const purgeBtn = window.document.getElementById('tasks-purge-btn');
    expect(purgeBtn.style.visibility).toBe('hidden');

    const alertBadge = window.document.getElementById('badge-alert');
    expect(alertBadge.textContent).toBe('STANDBY');

    const noteEl = window.document.getElementById('links-footer-note');
    expect(noteEl.textContent).toBe('');
  });

  test('Adding tasks populates banner stats and task progress descriptions', () => {
    const todoInput = window.document.getElementById('todo-input');
    const todoAddBtn = window.document.getElementById('todo-add');

    todoInput.value = 'Deploy Recon Unit';
    todoAddBtn.click();

    const statsEl = window.document.getElementById('banner-stats');
    expect(statsEl.textContent).toContain('0/1 OBJECTIVES COMPLETE — 0% EFFICIENCY RATING');

    const progressEl = window.document.getElementById('tasks-progress-text');
    expect(progressEl.textContent).toContain('0/1 complete');
  });

  test('Adding links populates quick links footer note', () => {
    const modalInput = window.document.getElementById('modal-link-label');
    const modalUrl = window.document.getElementById('modal-link-url');
    const modalSave = window.document.getElementById('modal-link-save');

    modalInput.value = 'Google';
    modalUrl.value = 'https://google.com';
    modalSave.click();

    const noteEl = window.document.getElementById('links-footer-note');
    expect(noteEl.textContent).toBe('Links persist via Local Storage. Opens in new tab.');
  });

  test('Focus Protocol card initialized with default 20:00 duration and — STANDBY —', () => {
    const minEl = window.document.getElementById('timer-mins');
    const secEl = window.document.getElementById('timer-secs');
    expect(minEl.textContent).toBe('20');
    expect(secEl.textContent).toBe('00');

    const statusEl = window.document.getElementById('timer-status-sub');
    expect(statusEl.textContent).toBe('— STANDBY —');

    const elapsedEl = window.document.getElementById('timer-elapsed-val');
    expect(elapsedEl.textContent).toBe('00:00');

    const dashes = window.document.querySelectorAll('.segmented-dash');
    expect(dashes.length).toBe(25);
  });

describe('Security & URL Validation', () => {
  test('isValidUrl returns true for valid http/https URLs', () => {
    expect(_testExports.isValidUrl('https://example.com')).toBe(true);
    expect(_testExports.isValidUrl('http://google.com')).toBe(true);
    expect(_testExports.isValidUrl('https://sub.domain.co/path?q=1')).toBe(true);
  });

  test('isValidUrl returns false for invalid or dangerous URLs', () => {
    expect(_testExports.isValidUrl('')).toBe(false);
    expect(_testExports.isValidUrl(null)).toBe(false);
    expect(_testExports.isValidUrl('ftp://files.com')).toBe(false);
    expect(_testExports.isValidUrl('javascript:alert(1)')).toBe(false);
  });

  test('normalizeUrl blocks javascript, data, and vbscript schemes', () => {
    expect(_testExports.normalizeUrl('javascript:alert(1)')).toBe('');
    expect(_testExports.normalizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(_testExports.normalizeUrl('vbscript:MsgBox(1)')).toBe('');
    expect(_testExports.normalizeUrl('JAVASCRIPT:void(0)')).toBe('');
  });
});

describe('Bounce Image File Validation', () => {
  test('validateBounceFile accepts valid JPEG files', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 500 });
    const result = _testExports.validateBounceFile(file);
    expect(result.ok).toBe(true);
  });

  test('validateBounceFile accepts valid PNG files', () => {
    const file = new File(['data'], 'image.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 * 300 });
    const result = _testExports.validateBounceFile(file);
    expect(result.ok).toBe(true);
  });

  test('validateBounceFile rejects non-image files', () => {
    const file = new File(['data'], 'script.html', { type: 'text/html' });
    Object.defineProperty(file, 'size', { value: 1024 });
    const result = _testExports.validateBounceFile(file);
    expect(result.ok).toBe(false);
  });

  test('validateBounceFile rejects files exceeding max size', () => {
    const file = new File(['data'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
    const result = _testExports.validateBounceFile(file);
    expect(result.ok).toBe(false);
  });
});
});
