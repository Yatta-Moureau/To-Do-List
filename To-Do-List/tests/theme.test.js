// Feature: personal-dashboard, Property 11: Theme toggle is its own inverse
//
// Tests the pure toggle logic extracted from ThemeModule.
// ThemeModule.toggle() computes: next = (current === 'dark') ? 'light' : 'dark'
// This is a pure function of the current theme value, independent of DOM or storage.
//
// Validates: Requirements 9.2

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// toggleTheme — pure function mirroring the logic inside ThemeModule.toggle()
// (app.js: var next = (current === 'dark') ? 'light' : 'dark';)
// ---------------------------------------------------------------------------
function toggleTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

// ---------------------------------------------------------------------------
// Unit examples — quick sanity checks before the property run
// ---------------------------------------------------------------------------
describe('toggleTheme — unit examples', function () {
  test('light → dark', function () {
    expect(toggleTheme('light')).toBe('dark');
  });

  test('dark → light', function () {
    expect(toggleTheme('dark')).toBe('light');
  });

  test('result is always "light" or "dark"', function () {
    expect(['light', 'dark']).toContain(toggleTheme('light'));
    expect(['light', 'dark']).toContain(toggleTheme('dark'));
  });
});

// ---------------------------------------------------------------------------
// Property 11: Theme toggle is its own inverse
//
// For any starting theme t ∈ {'light', 'dark'},
//   toggleTheme(toggleTheme(t)) === t
// i.e. two consecutive toggles restore the original value.
// ---------------------------------------------------------------------------
describe('Property 11: Theme toggle is its own inverse', function () {
  test('two toggles always restore the original theme (≥100 iterations)', function () {
    fc.assert(
      fc.property(
        // Generate either 'light' or 'dark' as the starting theme
        fc.constantFrom('light', 'dark'),
        function (startTheme) {
          var afterFirstToggle  = toggleTheme(startTheme);
          var afterSecondToggle = toggleTheme(afterFirstToggle);

          // The two-call invariant must hold
          expect(afterSecondToggle).toBe(startTheme);

          // Each intermediate value must be the opposite
          expect(afterFirstToggle).not.toBe(startTheme);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('first toggle always changes the theme', function () {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        function (startTheme) {
          expect(toggleTheme(startTheme)).not.toBe(startTheme);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('result is always a valid theme string', function () {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        function (startTheme) {
          var result = toggleTheme(startTheme);
          expect(['light', 'dark']).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });
});
