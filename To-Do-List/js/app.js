// ============================================================
// OUR TIME PERSONAL DASHBOARD — app.js
// UI Controller & State Architecture
// ============================================================

(function () {
  'use strict';

  /**
 * @module StorageService
 * @description localStorage abstraction with try/catch fallbacks.
 */
var StorageService = Object.freeze({
    KEY_THEME:             'pd_theme',
    KEY_NAME:              'pd_user_name',
    KEY_POMODORO_DURATION: 'pd_pomodoro_duration',
    KEY_TODOS:             'pd_todos',
    KEY_LINKS:             'pd_links',
    KEY_ALARMS:            'pd_alarms',
    KEY_CUSTOM_THEME:      'pd_custom_theme',
    KEY_BOUNCE_ENABLED:      'pd_bounce_enabled',
    KEY_BOUNCE_SPEED:        'pd_bounce_speed',
    KEY_BOUNCE_SIZE:         'pd_bounce_size',
    KEY_SFX_ENABLED:       'pd_sfx_enabled',
    KEY_CUSTOM_SOUND:      'pd_custom_sound',
    KEY_ALARM_USE_CUSTOM:  'pd_alarm_use_custom_sound',

    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    remove: function (key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

/**
 * @module UtilityHelpers
 * @description Pure helper functions for date formatting, greeting text,
 *              URL normalization, and efficiency calculations.
 */
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11)  return 'Good morning';
    if (hour >= 12 && hour <= 16) return 'Good afternoon';
    if (hour >= 17 && hour <= 20) return 'Good evening';
    return 'Good night';
  }

  function formatDateFull(date) {
    var WEEKDAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    var MONTHS   = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    return WEEKDAYS[date.getDay()] + ', ' + MONTHS[date.getMonth()] + ' ' +
           date.getDate() + ', ' + date.getFullYear();
  }

  function formatSysDate(date) {
    return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + '/' + date.getFullYear();
  }

  function formatTimeFull(d) {
    var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ' ' + ampm;
  }

  function format12HourTime(date) {
    var h = date.getHours();
    var m = pad2(date.getMinutes());
    var s = pad2(date.getSeconds());
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return pad2(h) + ':' + m + ':' + s + ' ' + ampm;
  }

  function formatMMSS(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return pad2(m) + ':' + pad2(s);
  }

  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed) return '';
    // Block javascript:, data:, vbscript: schemes
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
    if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  }

  function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var lower = url.trim().toLowerCase();
    return /^https?:\/\//.test(lower);
  }

  function calculateEfficiency(done, total) {
    if (total <= 0) return 100;
    return Math.round((done / total) * 100);
  }

  /**
 * @module SFXModule
 * @description Web Audio API synthesizer for interaction sounds.
 */
var SFXModule = (function () {
    var ctx = null;
    var enabled = true;

    function getCtx() {
      if (!ctx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return ctx;
    }

    function beep(freq, dur, vol, type) {
      if (!enabled) return;
      try {
        var c = getCtx();
        if (!c) return;
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(vol || 0.05, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + dur);
      } catch (e) {}
    }

    function playChime() {
      if (!enabled) return;
      try {
        var c = getCtx();
        if (!c) return;
        var now = c.currentTime;
        [
          { f: 523.25, t: 0 },
          { f: 659.25, t: 0.12 },
          { f: 783.99, t: 0.24 },
          { f: 1046.50, t: 0.38 }
        ].forEach(function (note) {
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.12, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + 0.5);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + 0.5);
        });
      } catch (e) {}
    }

    function initEvents() {
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('.btn-tactical') || t.closest('.btn-add-square')) {
          beep(880, 0.07, 0.04, 'sine');
        } else if (t.closest('.tactical-icon-btn') || t.closest('.tactical-theme-toggle')) {
          beep(1200, 0.06, 0.03, 'sine');
        } else if (t.closest('.priority-btn')) {
          beep(660, 0.05, 0.03, 'triangle');
        } else if (t.closest('.theme-preset-btn')) {
          beep(980, 0.08, 0.04, 'sine');
        } else if (t.closest('.link-anchor-btn')) {
          beep(1400, 0.05, 0.03, 'sine');
        } else if (t.closest('.task-act-btn') || t.closest('.task-custom-checkbox')) {
          beep(550, 0.06, 0.03, 'triangle');
        }
      }, true);
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_SFX_ENABLED);
        if (saved !== null) enabled = !!saved;

        document.addEventListener('click', function resume() {
          try {
            var c = getCtx();
            if (c && c.state === 'suspended') c.resume();
          } catch (e) {}
          document.removeEventListener('click', resume);
        }, { once: true });

        initEvents();
      },
      beep: beep,
      playChime: playChime,
      toggle: function () {
        enabled = !enabled;
        StorageService.set(StorageService.KEY_SFX_ENABLED, enabled);
      },
      isEnabled: function () { return enabled; }
    };
  }());

  /**
 * @module AlarmAudio
 * @description Built-in alarm sound generator using sawtooth waves.
 */
var AlarmAudio = (function () {
    var ctx = null;
    var repeatTimer = null;

    function getCtx() {
      if (!ctx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return ctx;
    }

    function tone(f, st, d, v) {
      var c = getCtx();
      if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, st);
      g.gain.setValueAtTime(v, st);
      g.gain.exponentialRampToValueAtTime(0.0001, st + d);
      o.connect(g);
      g.connect(c.destination);
      o.start(st);
      o.stop(st + d);
    }

    function playPattern() {
      try {
        var c = getCtx();
        if (!c) return;
        var n = c.currentTime;
        tone(587.33, n, 0.22, 0.2);
        tone(783.99, n + 0.18, 0.22, 0.2);
        tone(987.77, n + 0.36, 0.35, 0.24);
        tone(1174.66, n + 0.6, 0.5, 0.26);
      } catch (e) {}
    }

    return {
      play: function () {
        playPattern();
      },
      startRepeating: function () {
        AlarmAudio.stopRepeating();
        playPattern();
        repeatTimer = setInterval(playPattern, 1300);
      },
      stopRepeating: function () {
        if (repeatTimer) {
          clearInterval(repeatTimer);
          repeatTimer = null;
        }
      }
    };
  }());

    /**
 * @module SoundModule
 * @description Multi-sound alarm library with upload/play/rename.
 */
var SoundModule = (function () {
    var KEY_SOUNDS = 'pd_sound_library';
    var MAX_SOUNDS = 5;
    var MAX_SOUND_SIZE = 5 * 1024 * 1024;
    var ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    var sounds = [];
    var activeAudio = null;

    function persist() { StorageService.set(KEY_SOUNDS, sounds); }

    var playingIdx = -1;

    function renderLibrary() {
      var list = document.getElementById('sound-library-list');
      var status = document.getElementById('settings-sound-status');
      var select = document.getElementById('alarm-sound-select');
      if (!list) return;
      list.innerHTML = '';
      sounds.forEach(function(s, i) {
        var item = document.createElement('div');
        item.className = 'sound-lib-item' + (playingIdx === i ? ' playing' : '');
        var isPlaying = playingIdx === i;
        item.innerHTML = '<span class="sound-lib-name" title="Click to rename" data-idx="' + i + '">' + s.name + '</span>' +
          '<div class="sound-lib-actions">' +
          (isPlaying
            ? '<button class="btn-tactical btn-stop sound-stop-btn" data-idx="' + i + '">STOP</button>'
            : '<button class="btn-tactical btn-start sound-preview-btn" data-idx="' + i + '">PLAY</button>') +
          '<button class="btn-tactical btn-reset sound-remove-btn" data-idx="' + i + '">X</button></div>';
        list.appendChild(item);
      });
      // Play buttons
      list.querySelectorAll('.sound-preview-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          SoundModule.playSoundByIdx(parseInt(btn.getAttribute('data-idx'), 10));
        });
      });
      // Stop buttons
      list.querySelectorAll('.sound-stop-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          SoundModule.stopPreview();
        });
      });
      // Remove buttons
      list.querySelectorAll('.sound-remove-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          SoundModule.removeSound(parseInt(btn.getAttribute('data-idx'), 10));
        });
      });
      // Rename on name click
      list.querySelectorAll('.sound-lib-name').forEach(function(el) {
        el.addEventListener('click', function() {
          var idx = parseInt(el.getAttribute('data-idx'), 10);
          SoundModule.renameSound(idx, el);
        });
      });
      if (status) status.textContent = sounds.length > 0 ? sounds.length + ' sound(s) in library' : 'No sounds uploaded yet.';
      if (select) {
        select.innerHTML = '<option value="-1">Built-in Chime</option>';
        sounds.forEach(function(s, i) {
          var opt = document.createElement('option');
          opt.value = String(i); opt.textContent = s.name;
          select.appendChild(opt);
        });
      }
    }

    return {
      init: function () {
        var saved = StorageService.get(KEY_SOUNDS);
        sounds = Array.isArray(saved) ? saved : [];
        renderLibrary();
        var uploadBtn = document.getElementById('settings-sound-upload-btn');
        var fileInput = document.getElementById('settings-sound-input');
        if (uploadBtn && fileInput) {
          uploadBtn.addEventListener('click', function() {
            if (sounds.length >= MAX_SOUNDS) { ToastModule.error('Max ' + MAX_SOUNDS + ' sounds. Remove one first.'); return; }
            fileInput.click();
          });
          fileInput.addEventListener('change', function() {
            var files = fileInput.files;
            if (!files || files.length === 0) return;
            var remaining = MAX_SOUNDS - sounds.length;
            var toProcess = Math.min(files.length, remaining);
            for (var i = 0; i < toProcess; i++) {
              (function(file) {
                if (file.size > MAX_SOUND_SIZE) { ToastModule.error(file.name + ': too large (max 5MB)'); return; }
                var ext = file.name.toLowerCase();
                if (ALLOWED_AUDIO.indexOf(file.type) === -1 && !ext.match(/\.(mp3|wav|ogg)$/)) { ToastModule.error(file.name + ': unsupported format'); return; }
                var reader = new FileReader();
                reader.onload = function(e) {
                  sounds.push({id:'snd_'+Date.now()+'_'+Math.random().toString(36).substr(2,5), name:file.name, base64:e.target.result});
                  persist(); renderLibrary();
                  ToastModule.success('Sound added: ' + file.name);
                };
                reader.readAsDataURL(file);
              })(files[i]);
            }
            fileInput.value = '';
          });
        }
        var soundCheck = document.getElementById('alarm-use-custom-sound');
        if (soundCheck) {
          var useCust = StorageService.get(StorageService.KEY_ALARM_USE_CUSTOM);
          soundCheck.checked = useCust !== false;
          soundCheck.addEventListener('change', function () { StorageService.set(StorageService.KEY_ALARM_USE_CUSTOM, soundCheck.checked); });
        }
      },
      hasSounds: function() { return sounds.length > 0; },
      getCount: function() { return sounds.length; },
      removeSound: function(idx) {
        if (idx < 0 || idx >= sounds.length) return;
        sounds.splice(idx, 1); persist(); renderLibrary();
        ToastModule.info('Sound removed');
      },
      playSoundByIdx: function(idx) {
        if (idx < 0 || idx >= sounds.length) { AlarmAudio.play(); return; }
        try {
          if (activeAudio) { activeAudio.pause(); activeAudio = null; }
          playingIdx = idx;
          activeAudio = new Audio(sounds[idx].base64);
          activeAudio.loop = false;
          activeAudio.addEventListener('ended', function() { playingIdx = -1; renderLibrary(); });
          activeAudio.play().catch(function() { playingIdx = -1; renderLibrary(); AlarmAudio.play(); });
          renderLibrary();
        } catch(e) { playingIdx = -1; renderLibrary(); AlarmAudio.play(); }
      },
      stopPreview: function() {
        if (activeAudio) {
          try { activeAudio.pause(); activeAudio.currentTime = 0; } catch(e) {}
          activeAudio = null;
        }
        playingIdx = -1;
        renderLibrary();
      },
      renameSound: function(idx, el) {
        if (idx < 0 || idx >= sounds.length) return;
        var currentName = sounds[idx].name;
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'sound-rename-input';
        input.value = currentName;
        input.maxLength = 50;
        el.textContent = '';
        el.appendChild(input);
        input.focus();
        input.select();
        function save() {
          var newName = input.value.trim();
          if (newName && newName !== currentName) {
            sounds[idx].name = newName;
            persist();
            ToastModule.success('Renamed to: ' + newName);
          }
          renderLibrary();
        }
        input.addEventListener('blur', save);
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') { renderLibrary(); }
        });
      },
      playAlarmSound: function(alarmSoundIdx) {
        var useCustom = StorageService.get(StorageService.KEY_ALARM_USE_CUSTOM);
        if (useCustom === false || sounds.length === 0) { AlarmAudio.play(); return; }
        var idx = (typeof alarmSoundIdx === 'number' && alarmSoundIdx >= 0 && alarmSoundIdx < sounds.length) ? alarmSoundIdx : 0;
        try {
          if (activeAudio) { activeAudio.pause(); activeAudio = null; }
          activeAudio = new Audio(sounds[idx].base64);
          activeAudio.loop = false;
          activeAudio.play().catch(function() { AlarmAudio.play(); });
        } catch(e) { AlarmAudio.play(); }
      },
      startLoopAtIdx: function(idx) {
        var useCustom = StorageService.get(StorageService.KEY_ALARM_USE_CUSTOM);
        if (useCustom === false || sounds.length === 0) { AlarmAudio.startRepeating(); return; }
        var i = (typeof idx === 'number' && idx >= 0 && idx < sounds.length) ? idx : 0;
        try {
          if (activeAudio) { activeAudio.pause(); activeAudio = null; }
          activeAudio = new Audio(sounds[i].base64);
          activeAudio.loop = true;
          activeAudio.play().catch(function() { AlarmAudio.startRepeating(); });
        } catch(e) { AlarmAudio.startRepeating(); }
      },
      stopLoop: function() {
        if (activeAudio) {
          try { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio.loop = false; } catch(e) {}
          activeAudio = null;
        }
        AlarmAudio.stopRepeating();
      }
    };
  }());
/**
 * @module ThemeModule
 * @description Dark/light theme switcher with custom theme cleanup.
 */
var ThemeModule = (function () {
    function applyTheme(theme) {
      var normalised = (theme === 'light') ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', normalised);

      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.setAttribute('aria-label', normalised === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
      }
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_THEME);
        var theme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
        applyTheme(theme);

        var btn = document.getElementById('theme-toggle');
        if (btn) {
          btn.addEventListener('click', ThemeModule.toggle);
        }
      },

      toggle: function () {
        var current = document.documentElement.getAttribute('data-theme');
        var next = (current === 'dark') ? 'light' : 'dark';
        StorageService.set(StorageService.KEY_THEME, next);
        // Remove ALL inline style overrides from ThemeCustomizer
        var root = document.documentElement;
        var customTheme = StorageService.get(StorageService.KEY_CUSTOM_THEME);
        if (customTheme && typeof customTheme === 'object') {
          Object.keys(customTheme).forEach(function (k) {
            root.style.removeProperty(k);
          });
          StorageService.remove(StorageService.KEY_CUSTOM_THEME);
        }
        // Also clear any remaining inline style props that could be from custom theme
        var computedBg = getComputedStyle(document.body).backgroundColor;
        applyTheme(next);
        // Re-sync theme customizer pickers after theme switch
        if (typeof ThemeCustomizer !== 'undefined' && ThemeCustomizer.syncPickers) {
          ThemeCustomizer.syncPickers();
        }
        ToastModule.info('Theme switched to ' + next.toUpperCase() + ' mode');
      }
    };
  }());

  /**
 * @module GreetingModule
 * @description Live clock, greeting, and banner statistics.
 */
var GreetingModule = (function () {
    var timerId = null;

    function renderClock() {
      var now = new Date();

      var timeEl = document.getElementById('header-time');
      if (timeEl) {
        timeEl.textContent = format12HourTime(now);
      }

      var dateEl = document.getElementById('header-date');
      if (dateEl) {
        dateEl.textContent = formatDateFull(now);
      }

      var metaEl = document.getElementById('banner-meta');
      if (metaEl) {
        metaEl.textContent = 'SYS / DASHBOARD / ' + formatSysDate(now);
      }

      // Header clock (simple HH:MM:SS)
      var clockEl = document.getElementById('header-clock');
      if (clockEl) {
        clockEl.textContent = formatTimeFull(now);
      }
    }

    function renderGreeting() {
      var now = new Date();
      var greetingEl = document.getElementById('banner-greeting');
      if (greetingEl) {
        var base = getGreeting(now.getHours());
        var name = StorageService.get(StorageService.KEY_NAME);
        if (name && name.trim().length > 0) {
          base += ', ' + name.trim();
        } else {
          base += ', User';
        }
        greetingEl.textContent = base;
      }
    }

    function updateStats(tasks) {
      var total = tasks.length;
      var done = tasks.filter(function (t) { return t.done; }).length;
      var rating = calculateEfficiency(done, total);

      var statsEl = document.getElementById('banner-stats');
      if (statsEl) {
        if (total === 0) {
          statsEl.textContent = '';
        } else {
          statsEl.textContent = done + '/' + total + ' OBJECTIVES COMPLETE — ' + rating + '% EFFICIENCY RATING';
        }
      }

      var alertVal = document.getElementById('badge-alert');
      if (alertVal) {
        var hasPending = total > 0 && done < total;
        alertVal.textContent = hasPending ? 'PENDING' : 'STANDBY';
        alertVal.className = 'status-val ' + (hasPending ? 'status-pending' : 'status-active');
      }

      var progLabel = document.getElementById('tasks-progress-text');
      if (progLabel) {
        progLabel.textContent = total > 0 ? (done + '/' + total + ' complete') : '';
      }

      var purgeBtn = document.getElementById('tasks-purge-btn');
      if (purgeBtn) {
        purgeBtn.textContent = 'PURGE COMPLETE (' + done + ')';
        purgeBtn.style.visibility = done > 0 ? 'visible' : 'hidden';
      }
    }

    return {
      init: function () {
        renderClock();
        renderGreeting();
        timerId = setInterval(renderClock, 1000);
      },
      renderGreeting: renderGreeting,
      updateStats: updateStats
    };
  }());

  /**
 * @module TimerModule
 * @description Pomodoro timer (1-120 min) with segmented progress.
 */
var TimerModule = (function () {
    var TOTAL_SEGMENTS = 25;

    var state = {
      totalDurationSeconds: 20 * 60,
      remainingSeconds:     20 * 60,
      elapsedSeconds:       0,
      status:               'standby', // 'standby' | 'running' | 'paused' | 'completed'
      intervalId:           null
    };

    function getSavedDuration() {
      var saved = StorageService.get(StorageService.KEY_POMODORO_DURATION);
      if (saved && typeof saved === 'number' && saved >= 1 && saved <= 120) {
        return saved * 60;
      }
      return 20 * 60;
    }

    function renderDisplay() {
      var mins = Math.floor(state.remainingSeconds / 60);
      var secs = state.remainingSeconds % 60;

      var minEl = document.getElementById('timer-mins');
      var secEl = document.getElementById('timer-secs');
      if (minEl && secEl) {
        minEl.textContent = pad2(mins);
        secEl.textContent = pad2(secs);
      } else {
        var displayEl = document.getElementById('timer-display');
        if (displayEl) displayEl.textContent = pad2(mins) + ' : ' + pad2(secs);
      }

      var displayWrap = document.getElementById('timer-display');
      if (displayWrap) {
        displayWrap.classList.remove('running', 'paused');
        if (state.status === 'running') displayWrap.classList.add('running');
        else if (state.status === 'paused') displayWrap.classList.add('paused');
      }

      var subText = document.getElementById('timer-status-sub');
      if (subText) {
        subText.classList.remove('active-glow', 'standby-glow');
        if (state.status === 'running') {
          subText.textContent = '— FOCUS IN PROGRESS —';
          subText.classList.add('active-glow');
        } else if (state.status === 'paused') {
          subText.textContent = '— PAUSED —';
          subText.classList.add('active-glow');
        } else if (state.status === 'completed') {
          subText.textContent = '— OBJECTIVE COMPLETE —';
          subText.classList.add('active-glow');
        } else {
          subText.textContent = '— STANDBY —';
          subText.classList.add('standby-glow');
        }
      }

      var elapsedEl = document.getElementById('timer-elapsed-val');
      if (elapsedEl) {
        elapsedEl.textContent = formatMMSS(state.elapsedSeconds);
      }

      renderSegments();
    }

    function renderSegments() {
      var container = document.getElementById('timer-segments');
      if (!container) return;

      var fraction = state.totalDurationSeconds > 0
        ? (state.totalDurationSeconds - state.remainingSeconds) / state.totalDurationSeconds
        : 0;
      var filledCount = Math.round(fraction * TOTAL_SEGMENTS);

      if (container.children.length !== TOTAL_SEGMENTS) {
        container.innerHTML = '';
        for (var i = 0; i < TOTAL_SEGMENTS; i++) {
          var dash = document.createElement('div');
          dash.className = 'segmented-dash' + (i < filledCount ? ' filled' : '');
          container.appendChild(dash);
        }
      } else {
        for (var j = 0; j < TOTAL_SEGMENTS; j++) {
          var d = container.children[j];
          if (j < filledCount) d.classList.add('filled');
          else d.classList.remove('filled');
        }
      }
    }

    function clearTimerInterval() {
      if (state.intervalId !== null) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
    }

    function complete() {
      clearTimerInterval();
      state.status = 'completed';
      state.remainingSeconds = 0;
      renderDisplay();

      var alertEl = document.getElementById('timer-alert');
      if (alertEl) {
        alertEl.textContent = 'Focus session complete! Time for a break.';
        alertEl.hidden = false;
        setTimeout(function () { alertEl.hidden = true; }, 6000);
      }

      var useCustom = StorageService.get(StorageService.KEY_ALARM_USE_CUSTOM);
      if (useCustom !== false && SoundModule.hasSounds()) {
        SoundModule.playAlarmSound(0);
      } else {
        SFXModule.playChime();
      }

      ToastModule.success('Focus session complete!');
    }

    function tick() {
      if (state.remainingSeconds <= 1) {
        complete();
      } else {
        state.remainingSeconds -= 1;
        state.elapsedSeconds += 1;
        renderDisplay();
      }
    }

    return {
      init: function () {
        var duration = getSavedDuration();
        state.totalDurationSeconds = duration;
        state.remainingSeconds     = duration;
        state.elapsedSeconds       = 0;
        state.status               = 'standby';

        renderDisplay();

        var startBtn = document.getElementById('timer-start');
        var stopBtn  = document.getElementById('timer-stop');
        var resetBtn = document.getElementById('timer-reset');

        if (startBtn) startBtn.addEventListener('click', TimerModule.start);
        if (stopBtn)  stopBtn.addEventListener('click', TimerModule.stop);
        if (resetBtn) resetBtn.addEventListener('click', TimerModule.reset);
      },

      start: function () {
        if (state.status === 'running') return;
        if (state.status === 'completed' || state.remainingSeconds <= 0) {
          state.remainingSeconds = state.totalDurationSeconds;
          state.elapsedSeconds = 0;
        }
        state.status = 'running';
        clearTimerInterval();
        state.intervalId = setInterval(tick, 1000);
        renderDisplay();
      },

      stop: function () {
        if (state.status !== 'running') return;
        clearTimerInterval();
        state.status = 'paused';
        renderDisplay();
      },

      reset: function () {
        clearTimerInterval();
        var duration = getSavedDuration();
        state.totalDurationSeconds = duration;
        state.remainingSeconds     = duration;
        state.elapsedSeconds       = 0;
        state.status               = 'standby';

        var alertEl = document.getElementById('timer-alert');
        if (alertEl) alertEl.hidden = true;

        renderDisplay();
      },

      setDurationMinutes: function (minutes) {
        if (typeof minutes !== 'number' || minutes < 1 || minutes > 120) return;
        var secs = minutes * 60;
        StorageService.set(StorageService.KEY_POMODORO_DURATION, minutes);
        if (state.status === 'standby') {
          state.totalDurationSeconds = secs;
          state.remainingSeconds     = secs;
          state.elapsedSeconds       = 0;
          renderDisplay();
        }
      },

      getState: function () {
        return Object.assign({}, state);
      }
    };
  }());

  /**
 * @module TodoModule
 * @description Task CRUD with priority system (HIGH/MED/LOW).
 */
var TodoModule = (function () {
    var tasks = [];
    var activePriority = 'med';
    var editingId = null;

    var DEFAULT_TASKS = [];

    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function persist() {
      StorageService.set(StorageService.KEY_TODOS, tasks);
      GreetingModule.updateStats(tasks);
    }

    function showError(msg) {
      var err = document.getElementById('todo-error');
      if (err) {
        err.textContent = msg || '';
        err.hidden = !msg;
      }
    }

    function createTaskRow(task) {
      var li = document.createElement('li');
      li.className = 'task-item-row' + (task.done ? ' done' : '');
      li.dataset.id = task.id;

      // Custom Sci-Fi Checkbox
      var checkbox = document.createElement('div');
      checkbox.className = 'task-custom-checkbox' + (task.done ? ' checked' : '');
      checkbox.setAttribute('role', 'checkbox');
      checkbox.setAttribute('aria-checked', String(task.done));
      checkbox.setAttribute('tabindex', '0');
      checkbox.setAttribute('aria-label', 'Toggle: ' + task.text);

      checkbox.addEventListener('click', function (e) {
        e.stopPropagation();
        TodoModule.toggleComplete(task.id);
      });
      checkbox.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          TodoModule.toggleComplete(task.id);
        }
      });

      // Priority Tag
      var prio = task.priority || 'med';
      var prioTag = document.createElement('span');
      prioTag.className = 'task-priority-tag ' + prio;
      prioTag.textContent = prio.toUpperCase();

      if (editingId === task.id) {
        var editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-edit-input';
        editInput.value = task.text;
        editInput.maxLength = 200;

        editInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') TodoModule.saveEdit(task.id, editInput.value);
          else if (e.key === 'Escape') { editingId = null; TodoModule.render(); }
        });
        editInput.addEventListener('blur', function () {
          TodoModule.saveEdit(task.id, editInput.value);
        });

        li.appendChild(checkbox);
        li.appendChild(prioTag);
        li.appendChild(editInput);
        setTimeout(function () { editInput.focus(); }, 0);
      } else {
        var textSpan = document.createElement('span');
        textSpan.className = 'task-title-text' + (task.done ? ' done' : '');
        textSpan.textContent = task.text;
        textSpan.title = 'Double click to edit';
        textSpan.addEventListener('dblclick', function () {
          TodoModule.startEdit(task.id);
        });

        var actions = document.createElement('div');
        actions.className = 'task-actions';

        var editBtn = document.createElement('button');
        editBtn.className = 'task-act-btn';
        editBtn.innerHTML = '&#9998;';
        editBtn.title = 'Edit Objective';
        editBtn.setAttribute('aria-label', 'Edit objective: ' + task.text);
        editBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          TodoModule.startEdit(task.id);
        });

        var delBtn = document.createElement('button');
        delBtn.className = 'task-act-btn delete';
        delBtn.textContent = '×';
        delBtn.title = 'Delete Objective';
        delBtn.setAttribute('aria-label', 'Delete objective: ' + task.text);
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          TodoModule.deleteTask(task.id);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(checkbox);
        li.appendChild(prioTag);
        li.appendChild(textSpan);
        li.appendChild(actions);
      }

      return li;
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_TODOS);
        if (Array.isArray(saved)) {
          tasks = saved;
        } else {
          tasks = [];
          persist();
        }

        TodoModule.render();

        // Priority Switch Events
        document.querySelectorAll('.priority-segmented-switch .priority-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            document.querySelectorAll('.priority-segmented-switch .priority-btn').forEach(function (b) {
              b.classList.remove('active');
            });
            btn.classList.add('active');
            activePriority = btn.dataset.priority || 'med';
          });
        });

        // Add Task Events
        var addBtn = document.getElementById('todo-add');
        var input  = document.getElementById('todo-input');
        if (addBtn && input) {
          addBtn.addEventListener('click', function () {
            TodoModule.addTask(input.value, activePriority);
            input.value = '';
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              TodoModule.addTask(input.value, activePriority);
              input.value = '';
            }
          });
        }

        // Purge Complete Event
        var purgeBtn = document.getElementById('tasks-purge-btn');
        if (purgeBtn) {
          purgeBtn.addEventListener('click', TodoModule.purgeComplete);
        }
      },

      render: function () {
        var list = document.getElementById('todo-list');
        if (!list) return;
        list.innerHTML = '';
        tasks.forEach(function (t) {
          list.appendChild(createTaskRow(t));
        });
        GreetingModule.updateStats(tasks);
      },

      addTask: function (text, priority) {
        var trimmed = (text || '').trim();
        if (!trimmed) {
          showError('Objective description cannot be empty.');
          return null;
        }
        showError('');

        var newTask = {
          id: generateId(),
          text: trimmed,
          priority: priority || activePriority || 'med',
          done: false,
          createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        persist();
        TodoModule.render();
        ToastModule.success('New task added');
        return newTask;
      },

      toggleComplete: function (id) {
        var task = tasks.find(function (t) { return t.id === id; });
        if (task) {
          task.done = !task.done;
          persist();
          TodoModule.render();
        }
      },

      startEdit: function (id) {
        editingId = id;
        TodoModule.render();
      },

      saveEdit: function (id, newText) {
        var trimmed = (newText || '').trim();
        if (trimmed) {
          var task = tasks.find(function (t) { return t.id === id; });
          if (task) task.text = trimmed;
        }
        editingId = null;
        persist();
        TodoModule.render();
      },

      deleteTask: function (id) {
        tasks = tasks.filter(function (t) { return t.id !== id; });
        persist();
        TodoModule.render();
        ToastModule.info('Task deleted');
      },

      purgeComplete: function () {
        var initialCount = tasks.length;
        tasks = tasks.filter(function (t) { return !t.done; });
        var removedCount = initialCount - tasks.length;
        persist();
        TodoModule.render();
        ToastModule.info('Purged ' + removedCount + ' completed objective' + (removedCount === 1 ? '' : 's'));
      },

      getTasks: function () {
        return tasks.slice();
      }
    };
  }());

  /**
 * @module LinksModule
 * @description Quick links with modal add/remove interface.
 */
var LinksModule = (function () {
    var links = [];

    var DEFAULT_LINKS = [];

    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function persist() {
      StorageService.set(StorageService.KEY_LINKS, links);
    }

    function renderLinkItem(link) {
      var item = document.createElement('div');
      item.className = 'link-pill-item';

      var anchor = document.createElement('a');
      anchor.href = normalizeUrl(link.url);
      anchor.className = 'link-anchor-btn';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';

      var labelSpan = document.createElement('span');
      labelSpan.textContent = link.label;

      var arrowSpan = document.createElement('span');
      arrowSpan.className = 'link-trailing-arrow';
      arrowSpan.textContent = '↗';

      anchor.appendChild(labelSpan);
      anchor.appendChild(arrowSpan);

      var delBtn = document.createElement('button');
      delBtn.className = 'link-delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Remove Link';
      delBtn.setAttribute('aria-label', 'Remove link: ' + link.label);
      delBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        LinksModule.deleteLink(link.id);
      });

      item.appendChild(anchor);
      item.appendChild(delBtn);
      return item;
    }

    function openAddModal() {
      var modal = document.getElementById('add-link-modal');
      var labelInput = document.getElementById('modal-link-label');
      var urlInput   = document.getElementById('modal-link-url');
      var err        = document.getElementById('modal-link-error');

      if (labelInput) labelInput.value = '';
      if (urlInput)   urlInput.value = '';
      if (err)        err.hidden = true;
      if (modal) {
        modal.hidden = false;
        if (labelInput) labelInput.focus();
      }
    }

    function closeAddModal() {
      var modal = document.getElementById('add-link-modal');
      if (modal) modal.hidden = true;
    }

    function saveNewLink() {
      var labelInput = document.getElementById('modal-link-label');
      var urlInput   = document.getElementById('modal-link-url');
      var err        = document.getElementById('modal-link-error');

      var label = (labelInput ? labelInput.value : '').trim();
      var url   = (urlInput ? urlInput.value : '').trim();

      if (!label) {
        if (err) { err.textContent = 'Link label is required.'; err.hidden = false; }
        return;
      }
      if (!url) {
        if (err) { err.textContent = 'Target URL is required.'; err.hidden = false; }
        return;
      }

      var normalized = normalizeUrl(url);
      LinksModule.addLink(label, normalized);
      closeAddModal();
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_LINKS);
        if (Array.isArray(saved)) {
          links = saved;
        } else {
          links = [];
          persist();
        }

        LinksModule.render();

        var openBtn   = document.getElementById('add-link-btn');
        var closeBtn  = document.getElementById('modal-link-close');
        var cancelBtn = document.getElementById('modal-link-cancel');
        var saveBtn   = document.getElementById('modal-link-save');
        var modal     = document.getElementById('add-link-modal');

        if (openBtn)   openBtn.addEventListener('click', openAddModal);
        if (closeBtn)  closeBtn.addEventListener('click', closeAddModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeAddModal);
        if (saveBtn)   saveBtn.addEventListener('click', saveNewLink);

        if (modal) {
          modal.addEventListener('click', function (e) {
            if (e.target === modal) closeAddModal();
          });
        }
      },

      render: function () {
        var grid = document.getElementById('links-grid');
        if (!grid) return;
        grid.innerHTML = '';
        links.forEach(function (l) {
          grid.appendChild(renderLinkItem(l));
        });
        var note = document.getElementById('links-footer-note') || document.querySelector('.links-footer-note');
        if (note) {
          note.textContent = links.length > 0 ? 'Links persist via Local Storage. Opens in new tab.' : '';
        }
      },

      addLink: function (label, url) {
        var newLink = {
          id: generateId(),
          label: label.trim(),
          url: normalizeUrl(url)
        };
        links.push(newLink);
        persist();
        LinksModule.render();
        ToastModule.success('Link added');
        return newLink;
      },

      deleteLink: function (id) {
        links = links.filter(function (l) { return l.id !== id; });
        persist();
        LinksModule.render();
        ToastModule.info('Link removed');
      },

      openAddModal: openAddModal,
      closeAddModal: closeAddModal,
      getLinks: function () { return links.slice(); }
    };
  }());

  /**
 * @module AlarmSystem
 * @description Alarm scheduling with repeat logic and trigger detection.
 */
var AlarmSystem = (function () {
    var alarms = [];
    var triggerCallback = null;

    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function persist() {
      StorageService.set(StorageService.KEY_ALARMS, alarms);
    }

    function isDueToday(alarm) {
      var day = new Date().getDay();
      if (alarm.repeat === 'once' || alarm.repeat === 'daily') return true;
      if (alarm.repeat === 'weekdays') return day >= 1 && day <= 5;
      if (alarm.repeat === 'weekends') return day === 0 || day === 6;
      return true;
    }

    function checkAlarms() {
      var now = new Date();
      var currentHHMM = pad2(now.getHours()) + ':' + pad2(now.getMinutes());

      alarms.forEach(function (a) {
        if (!a.enabled || a.time !== currentHHMM || !isDueToday(a) || a.lastTriggered === currentHHMM) return;
        a.lastTriggered = currentHHMM;
        if (a.repeat === 'once') a.enabled = false;
        persist();
        if (triggerCallback) triggerCallback(a);
      });
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_ALARMS);
        alarms = Array.isArray(saved) ? saved : [];
        persist();

        setInterval(checkAlarms, 10000);
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) checkAlarms();
        });
      },

      addAlarm: function (config) {
        var newAlarm = {
          id: generateId(),
          time: config.time || '08:00',
          label: (config.label || 'Alert').trim(),
          repeat: config.repeat || 'once',
          enabled: true,
          createdAt: new Date().toISOString(),
          lastTriggered: null
        };
        alarms.push(newAlarm);
        persist();
        return newAlarm;
      },

      removeAlarm: function (id) {
        alarms = alarms.filter(function (a) { return a.id !== id; });
        persist();
      },

      toggleAlarm: function (id) {
        var alarm = alarms.find(function (a) { return a.id === id; });
        if (alarm) {
          alarm.enabled = !alarm.enabled;
          persist();
        }
      },

      snoozeAlarm: function (id, minutes) {
        var now = new Date();
        now.setMinutes(now.getMinutes() + (minutes || 5));
        var snoozeTime = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
        return AlarmSystem.addAlarm({
          time: snoozeTime,
          label: 'SNOOZE: ' + (alarms.find(function (a) { return a.id === id; })?.label || 'Alert'),
          repeat: 'once'
        });
      },

      getAlarms: function () { return alarms.slice(); },
      onTrigger: function (fn) { triggerCallback = fn; }
    };
  }());

/**

 * @module AlarmUI

 * @description Alarm list rendering, trigger overlay, snooze/dismiss UI.

 *              Coordinates with SoundModule for alarm audio playback.

 */

  var AlarmUI = (function () {
    var activeAlarm = null;

    function renderList() {
      var list = document.getElementById('alarm-list');
      if (!list) return;
      var alarms = AlarmSystem.getAlarms();
      list.innerHTML = '';

      if (alarms.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'alarm-empty-state';
        var emptyIcon = document.createElement('span');
        emptyIcon.className = 'alarm-empty-icon';
        emptyIcon.textContent = '∘';
        var emptyText = document.createElement('span');
        emptyText.textContent = 'No alarms configured';
        emptyDiv.appendChild(emptyIcon);
        emptyDiv.appendChild(emptyText);
        list.appendChild(emptyDiv);
        return;
      }

      alarms.forEach(function (a) {
        var item = document.createElement('div');
        item.className = 'alarm-item' + (a.enabled ? '' : ' disabled');

        var timeSpan = document.createElement('span');
        timeSpan.className = 'alarm-item-time';
        timeSpan.textContent = a.time;

        var labelSpan = document.createElement('span');
        labelSpan.className = 'alarm-item-label';
        labelSpan.textContent = a.label || 'Alarm';

        var repeatSpan = document.createElement('span');
        repeatSpan.className = 'alarm-item-repeat';
        repeatSpan.textContent = a.repeat.toUpperCase();

        var actions = document.createElement('div');
        actions.className = 'alarm-item-actions';

        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'task-act-btn';
        toggleBtn.textContent = a.enabled ? '⏸' : '▶';
        toggleBtn.title = a.enabled ? 'Disable alarm' : 'Enable alarm';
        toggleBtn.addEventListener('click', function () {
          AlarmSystem.toggleAlarm(a.id);
          renderList();
        });

        var delBtn = document.createElement('button');
        delBtn.className = 'task-act-btn delete';
        delBtn.textContent = '×';
        delBtn.title = 'Delete alarm';
        delBtn.addEventListener('click', function () {
          AlarmSystem.removeAlarm(a.id);
          renderList();
          ToastModule.info('Alarm deleted');
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(delBtn);

        item.appendChild(timeSpan);
        item.appendChild(labelSpan);
        item.appendChild(repeatSpan);
        item.appendChild(actions);

        list.appendChild(item);
      });
    }

    function openModal() {
      var modal = document.getElementById('alarm-modal');
      var timeInput  = document.getElementById('alarm-time-input');
      var labelInput = document.getElementById('alarm-label-input');
      var err        = document.getElementById('alarm-modal-error');

      var now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      if (timeInput) timeInput.value = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
      if (labelInput) labelInput.value = '';
      if (err) err.hidden = true;
      if (modal) modal.hidden = false;
    }

    function closeModal() {
      var modal = document.getElementById('alarm-modal');
      if (modal) modal.hidden = true;
    }

    function showTriggerOverlay(alarm) {
      activeAlarm = alarm;
      var overlay = document.getElementById('alarm-overlay');
      var timeEl  = document.getElementById('alarm-overlay-time');
      var textEl  = document.getElementById('alarm-overlay-text');

      if (timeEl) timeEl.textContent = alarm.time;
      if (textEl) textEl.textContent = alarm.label || 'ALARM';
      if (overlay) overlay.hidden = false;

      var soundIdx = (typeof alarm.soundIdx === 'number') ? alarm.soundIdx : -1;
      SoundModule.startLoopAtIdx(soundIdx >= 0 ? soundIdx : 0);
    }

    function dismissOverlay() {
      var overlay = document.getElementById('alarm-overlay');
      if (overlay) overlay.hidden = true;
      activeAlarm = null;
      SoundModule.stopLoop();
    }

    return {
      init: function () {
        renderList();

        var addBtn    = document.getElementById('alarm-add-btn');
        var closeBtn  = document.getElementById('alarm-modal-close');
        var cancelBtn = document.getElementById('alarm-modal-cancel');
        var saveBtn   = document.getElementById('alarm-modal-save');
        var snoozeBtn = document.getElementById('alarm-snooze-btn');
        var disBtn    = document.getElementById('alarm-dismiss-btn');

        if (addBtn)    addBtn.addEventListener('click', openModal);
        if (closeBtn)  closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (saveBtn) {
          saveBtn.addEventListener('click', function () {
            var timeInput  = document.getElementById('alarm-time-input');
            var labelInput = document.getElementById('alarm-label-input');
            var repSelect  = document.getElementById('alarm-repeat-select');
            var err        = document.getElementById('alarm-modal-error');

            var time = (timeInput ? timeInput.value : '').trim();
            if (!time) {
              if (err) { err.textContent = 'Please select a valid time.'; err.hidden = false; }
              return;
            }

            var soundSelect = document.getElementById('alarm-sound-select');
            var soundIdxVal = soundSelect ? parseInt(soundSelect.value, 10) : -1;

            AlarmSystem.addAlarm({
              time: time,
              label: labelInput ? labelInput.value : '',
              repeat: repSelect ? repSelect.value : 'once',
              soundIdx: isNaN(soundIdxVal) ? -1 : soundIdxVal
            });

            closeModal();
            renderList();
            ToastModule.success('Alarm scheduled for ' + time);
          });
        }

        if (snoozeBtn) {
          snoozeBtn.addEventListener('click', function () {
            SoundModule.stopLoop();
            if (activeAlarm) {
              AlarmSystem.snoozeAlarm(activeAlarm.id, 5);
              renderList();
              ToastModule.info('Alarm snoozed for 5 minutes');
            }
            dismissOverlay();
          });
        }

        if (disBtn) disBtn.addEventListener('click', dismissOverlay);

        AlarmSystem.onTrigger(function (a) {
          showTriggerOverlay(a);
        });
      },
      renderList: renderList
    };
  }());

  /**
 * @module SettingsModule
 * @description Settings panel with data backup/restore.
 */
var SettingsModule = (function () {
    var isOpen = false;

    function openPanel() {
      isOpen = true;
      var panel = document.getElementById('settings-panel');
      var overlay = document.getElementById('settings-overlay');
      if (panel) { panel.classList.add('settings-panel--open'); panel.setAttribute('aria-hidden', 'false'); }
      if (overlay) overlay.hidden = false;
    }

    function closePanel() {
      isOpen = false;
      var panel = document.getElementById('settings-panel');
      var overlay = document.getElementById('settings-overlay');
      if (panel) { panel.classList.remove('settings-panel--open'); panel.setAttribute('aria-hidden', 'true'); }
      if (overlay) overlay.hidden = true;
    }

    return {
      init: function () {
        var openBtn  = document.getElementById('settings-open');
        var closeBtn = document.getElementById('settings-close');
        var overlay  = document.getElementById('settings-overlay');

        if (openBtn)  openBtn.addEventListener('click', openPanel);
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        if (overlay)  overlay.addEventListener('click', closePanel);

        // Name Save
        var nameInput = document.getElementById('settings-name');
        var nameBtn   = document.getElementById('settings-name-save');
        if (nameInput) {
          var savedName = StorageService.get(StorageService.KEY_NAME);
          if (savedName) nameInput.value = savedName;
        }
        if (nameBtn && nameInput) {
          nameBtn.addEventListener('click', function () {
            var val = nameInput.value.trim();
            if (val) StorageService.set(StorageService.KEY_NAME, val);
            else StorageService.remove(StorageService.KEY_NAME);
            GreetingModule.renderGreeting();
            ToastModule.success('Name saved');
            closePanel();
          });
        }

        // Duration Save
        var durInput = document.getElementById('settings-duration');
        var durBtn   = document.getElementById('settings-duration-save');
        if (durInput) {
          var savedDur = StorageService.get(StorageService.KEY_POMODORO_DURATION);
          if (savedDur) durInput.value = savedDur;
        }
        if (durBtn && durInput) {
          durBtn.addEventListener('click', function () {
            var val = parseInt(durInput.value, 10);
            if (!isNaN(val) && val >= 1 && val <= 120) {
              TimerModule.setDurationMinutes(val);
              ToastModule.success('Focus duration updated: ' + val + ' min');
              closePanel();
            } else {
              ToastModule.error('Duration must be between 1 and 120 minutes');
            }
          });
        }

        // Sound Library initialized by SoundModule.init()

        // Data Export
        var expBtn = document.getElementById('data-export-btn');
        if (expBtn) {
          expBtn.addEventListener('click', function () {
            var backup = {
              version: 2,
              exportedAt: new Date().toISOString(),
              theme: StorageService.get(StorageService.KEY_THEME),
              userName: StorageService.get(StorageService.KEY_NAME),
              duration: StorageService.get(StorageService.KEY_POMODORO_DURATION),
              todos: StorageService.get(StorageService.KEY_TODOS),
              links: StorageService.get(StorageService.KEY_LINKS),
              alarms: StorageService.get(StorageService.KEY_ALARMS),
              customTheme: StorageService.get(StorageService.KEY_CUSTOM_THEME),
              bounceEnabled: StorageService.get(StorageService.KEY_BOUNCE_ENABLED),
              bounceSpeed: StorageService.get(StorageService.KEY_BOUNCE_SPEED),
              bounceSize: StorageService.get(StorageService.KEY_BOUNCE_SIZE)
            };
            var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'our_time_backup_' + new Date().toISOString().slice(0,10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
            ToastModule.success('Data exported successfully');
          });
        }

        // Data Import
        var impBtn = document.getElementById('data-import-btn');
        var impIn  = document.getElementById('data-import-input');
        if (impBtn && impIn) {
          impBtn.addEventListener('click', function () { impIn.click(); });
          impIn.addEventListener('change', function () {
            var file = impIn.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e) {
              try {
                var data = JSON.parse(e.target.result);
                if (data.theme) StorageService.set(StorageService.KEY_THEME, data.theme);
                if (data.userName) StorageService.set(StorageService.KEY_NAME, data.userName);
                if (data.duration) StorageService.set(StorageService.KEY_POMODORO_DURATION, data.duration);
                if (Array.isArray(data.todos)) StorageService.set(StorageService.KEY_TODOS, data.todos);
                if (Array.isArray(data.links)) StorageService.set(StorageService.KEY_LINKS, data.links);
                if (Array.isArray(data.alarms)) StorageService.set(StorageService.KEY_ALARMS, data.alarms);
                if (data.customTheme) StorageService.set(StorageService.KEY_CUSTOM_THEME, data.customTheme)
                if (typeof data.bounceEnabled === "boolean") StorageService.set(StorageService.KEY_BOUNCE_ENABLED, data.bounceEnabled);
                if (typeof data.bounceSpeed === "number") StorageService.set(StorageService.KEY_BOUNCE_SPEED, data.bounceSpeed);
                if (typeof data.bounceSize === "number") StorageService.set(StorageService.KEY_BOUNCE_SIZE, data.bounceSize);

                ToastModule.success('Backup restored! Reloading...');
                setTimeout(function () { window.location.reload(); }, 800);
              } catch (err) {
                ToastModule.error('Failed to parse backup JSON file');
              }
            };
            reader.readAsText(file);
          });
        }
      },
      openPanel: openPanel,
      closePanel: closePanel
    };
  }());

    /**
 * @module BounceImages
 * @description Floating image animation with particle trails.
 */
var BounceImages = (function () {
    var DB_NAME = 'OurTimeBounceDB';
    var DB_VERSION = 1;
    var STORE_NAME = 'images';
    var MAX_IMAGES = 5;
    var MAX_FILE_SIZE = 2 * 1024 * 1024;
    var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
    var ALLOWED_EXT = ['.jpg', '.jpeg', '.png'];
    var db = null; var enabled = true; var speed = 4; var imageSize = 100; var images = [];
    var container = null; var imgElements = []; var animFrames = []; var paused = false; var animFrameId = 0; var frameCount = 0;
    var canvas = null, ctx = null;
    var particles = [];
    var MAX_PARTICLES = 40;
    var PARTICLE_SPAWN_RATE = 1; // fewer particles per bouncer per frame
    var PARTICLE_LIFE = 1.2; // longer life, more ash-like fade
    var PARTICLE_SIZE_MIN = 1;
    var PARTICLE_SIZE_MAX = 2;

    function validateFile(file) {
      if (!file || typeof file.name !== 'string') return { ok: false, reason: 'Invalid file' };
      var mimeOk = ALLOWED_TYPES.indexOf(file.type.toLowerCase()) !== -1;
      if (!mimeOk) return { ok: false, reason: 'Not a JPEG file (' + (file.type || 'unknown') + ')' };
      var nameLower = file.name.toLowerCase();
      var extOk = ALLOWED_EXT.some(function (ext) { return nameLower.endsWith(ext); });
      if (!extOk) return { ok: false, reason: 'File must have .jpg or .jpeg extension' };
      if (file.size > MAX_FILE_SIZE) return { ok: false, reason: 'File too large (' + Math.round(file.size / 1024 / 1024) + 'MB). Max 2MB.' };
      if (file.size === 0) return { ok: false, reason: 'File is empty' };
      return { ok: true };
    }

    function openDB() {
      return new Promise(function (resolve, reject) {
        if (db) { resolve(db); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME)) {
            d.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = function (e) { db = e.target.result; resolve(db); };
        req.onerror = function () { reject(new Error('IndexedDB open failed')); };
      });
    }

    function dbAddImage(id, blob) {
      return openDB().then(function (d) {
        return new Promise(function (resolve, reject) {
          var tx = d.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({ id: id, blob: blob });
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { reject(new Error('DB put failed')); };
        });
      });
    }

    function dbRemoveImage(id) {
      return openDB().then(function (d) {
        return new Promise(function (resolve, reject) {
          var tx = d.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(id);
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { reject(new Error('DB delete failed')); };
        });
      });
    }

    function dbGetAll() {
      return openDB().then(function (d) {
        return new Promise(function (resolve, reject) {
          var tx = d.transaction(STORE_NAME, 'readonly');
          var req = tx.objectStore(STORE_NAME).getAll();
          req.onsuccess = function () { resolve(req.result || []); };
          req.onerror = function () { reject(new Error('DB getAll failed')); };
        });
      });
    }

    function blobToUrl(blob) {
      if (blob instanceof Blob) return URL.createObjectURL(blob);
      return null;
    }

    var bouncers = [];

    // --- Particle Trail System ---
    function initCanvas() {
      container = document.getElementById('bounce-images-container');
      if (!container) return;
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
      container.insertBefore(canvas, container.firstChild);
      ctx = canvas.getContext('2d');
      resizeCanvas();
    }

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawnParticle(x, y, bouncer) {
      if (particles.length >= MAX_PARTICLES) return;
      var angle = Math.random() * Math.PI * 2;
      var spread = 2 + Math.random() * 4;
      particles.push({
        x: x + bouncer.imgW * 0.5 + (Math.random() - 0.5) * 1,
        y: y + bouncer.imgH * 0.5 + (Math.random() - 0.5) * 1,
        vx: Math.cos(angle) * spread * 0.15,
        vy: Math.sin(angle) * spread * 0.15 - 1,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN),
        hue: 200 + Math.random() * 10,
        sat: 15 + Math.random() * 20
      });
    }

    function updateParticles(dt) {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 5 * dt; // slight upward drift
        p.size *= 0.995;
      }
    }

    function renderParticles() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var len = particles.length;
      for (var i = 0; i < len; i++) {
        var p = particles[i];
        var alpha = (p.life / p.maxLife) * 0.35;
        var sat = p.sat || 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ', ' + sat + '%, 65%, ' + alpha + ')';
        ctx.fill();
      }
    }

    var lastTime = 0;

    function initBouncer(idx, imgEl, w, h) {
      var imgW = (imgEl.naturalWidth || imgEl.offsetWidth || 80);
      var imgH = (imgEl.naturalHeight || imgEl.offsetHeight || 80);
      var angle = Math.random() * Math.PI * 2;
      var baseSpeed = 10 + Math.random() * 10; // 10-20 px/s very slow
      var speedMult = 0.6 + Math.random() * 0.8; // 0.6x-1.4x per image
      var state = {
        el: imgEl,
        x: Math.random() * Math.max(1, w - imgW),
        y: Math.random() * Math.max(1, h - imgH),
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        imgW: imgW, imgH: imgH, rotation: 0,
        rotSpeed: 3 + Math.random() * 4, // very slow 360 rotation
        speedMult: speedMult,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 0.8 + Math.random() * 1.2, // 0.8-2.0 Hz
        wobbleAmp: 2 + Math.random() * 4, // 2-6 px/s amplitude
        bounceEasing: 0,
        squashX: 1.0,
        squashY: 1.0
      };
      imgEl.style.left = '0px';
      imgEl.style.top = '0px';
      bouncers[idx] = state;
      return state;
    }

    function animate(timestamp) {
      if (paused) {
        lastTime = 0;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = 0;
        return;
      }
      if (!lastTime) lastTime = timestamp;
      var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;
      frameCount++;
      var w = window.innerWidth;
      var h = window.innerHeight;
      var factor = 160 / speed;

      bouncers.forEach(function (b) {
        if (!b || !b.el) return;

        // Recalc size each frame for accuracy
        b.imgW = b.el.offsetWidth || 80;
        b.imgH = b.el.offsetHeight || 80;

        // Per-bouncer speed multiplier
        var sm = b.speedMult || 1;
        var bf = factor * sm;

        // Sine wobble for organic movement (adds subtle curving path)
        b.wobblePhase += b.wobbleFreq * dt;
        var wobbleX = Math.sin(b.wobblePhase) * b.wobbleAmp;
        var wobbleY = Math.cos(b.wobblePhase * 0.7) * b.wobbleAmp * 0.6;

        // Smooth easing on bounce (decay the easing factor)
        if (b.bounceEasing > 0.01) {
          b.bounceEasing *= 0.92; // ease back toward full speed
        } else {
          b.bounceEasing = 0;
        }
        var easeMult = 1 - b.bounceEasing * 0.35;

        // Apply velocity with wobble and easing
        b.x += (b.vx * easeMult + wobbleX) * dt * bf;
        if (frameCount % 3 === 0) spawnParticle(b.x, b.y, b);
        b.y += (b.vy * easeMult + wobbleY) * dt * bf;

        // Rotation with per-bouncer variance
        b.rotation += b.rotSpeed * dt * sm;

        // Wall collision with easing (velocity decays briefly on impact)
        var bounced = false;
        if (b.x <= 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
          bounced = true;
        }
        if (b.x >= w - b.imgW) {
          b.x = w - b.imgW;
          b.vx = -Math.abs(b.vx);
          bounced = true;
        }
        if (b.y <= 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
          bounced = true;
        }
        if (b.y >= h - b.imgH) {
          b.y = h - b.imgH;
          b.vy = -Math.abs(b.vy);
          bounced = true;
        }

        // On bounce: trigger squash/stretch effect
        if (bounced) {
          if (Math.abs(b.vx) > Math.abs(b.vy)) {
            b.squashX = 0.7;
            b.squashY = 1.25;
          } else {
            b.squashX = 1.25;
            b.squashY = 0.7;
          }
          b.rotSpeed *= (0.7 + Math.random() * 0.6);
        }

        // Smoothly recover squash back to 1.0
        b.squashX += (1.0 - b.squashX) * 5 * dt;
        b.squashY += (1.0 - b.squashY) * 5 * dt;

        b.el.style.transform = 'translate(' + b.x + 'px, ' + b.y + 'px) rotate(' + b.rotation + 'deg) scale(' + b.squashX.toFixed(3) + ', ' + b.squashY.toFixed(3) + ')';
      });
      updateParticles(dt);
      renderParticles();
      animFrameId = requestAnimationFrame(animate);
    }

    function renderThumbnails() {
      var grid = document.getElementById('bounce-thumb-grid');
      var countLabel = document.getElementById('bounce-count-label');
      if (!grid) return;
      var slots = grid.querySelectorAll('.bounce-thumb-slot');
      slots.forEach(function (slot, i) {
        if (i < images.length) {
          slot.innerHTML = '';
          var img = document.createElement('img');
          img.src = images[i].url;
          img.alt = 'Bounce image ' + (i + 1);
          slot.appendChild(img);
          var removeBtn = document.createElement('button');
          removeBtn.className = 'bounce-thumb-remove';
          removeBtn.textContent = '\u00d7';
          removeBtn.setAttribute('aria-label', 'Remove image ' + (i + 1));
          removeBtn.setAttribute('data-idx', String(i));
          removeBtn.addEventListener('click', function () {
            removeImage(parseInt(this.getAttribute('data-idx'), 10));
          });
          slot.appendChild(removeBtn);
        } else {
          slot.innerHTML = '<span class="bounce-thumb-empty">+</span>';
        }
      });
      if (countLabel) {
        countLabel.textContent = images.length + ' / ' + MAX_IMAGES + ' images loaded';
      }
    }

    function renderBounceImages() {
      container = document.getElementById('bounce-images-container');
      if (!container) return;
      container.innerHTML = '';
      imgElements = [];
      bouncers = [];
      particles = [];
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = 0;
      lastTime = 0;
      if (!enabled || images.length === 0) {
        container.hidden = true;
        return;
      }
      container.hidden = false;
      initCanvas();
      var w = window.innerWidth;
      var h = window.innerHeight;
      images.forEach(function (imgData, i) {
        var imgEl = document.createElement('img');
        imgEl.className = 'bounce-img';
        imgEl.style.opacity = '1';
        imgEl.src = imgData.url;
        imgEl.alt = '';
        imgEl.setAttribute('aria-hidden', 'true');
        container.appendChild(imgEl);
        imgElements.push(imgEl);
        initBouncer(i, imgEl, w, h);
      });
      if (images.length > 0) {
        animFrameId = requestAnimationFrame(animate);
      }
    }

    function addImage(file) {
      return new Promise(function (resolve, reject) {
        if (images.length >= MAX_IMAGES) { reject(new Error('Maximum ' + MAX_IMAGES + ' images allowed')); return; }
        var validation = validateFile(file);
        if (!validation.ok) { reject(new Error(validation.reason)); return; }
        var id = 'bounce_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        dbAddImage(id, file).then(function () {
          images.push({ id: id, blob: file, url: blobToUrl(file) });
          renderThumbnails();
          renderBounceImages();
          resolve();
        }).catch(reject);
      });
    }

    function removeImage(idx) {
      if (idx < 0 || idx >= images.length) return;
      var imgData = images[idx];
      if (imgData.
url) URL.revokeObjectURL(imgData.url);
      dbRemoveImage(imgData.id).then(function () {
        images.splice(idx, 1);
        renderThumbnails();
        renderBounceImages();
      }).catch(function () {
        images.splice(idx, 1);
        renderThumbnails();
        renderBounceImages();
      });
    }

    function onVisibilityChange() {
      if (document.hidden) { paused = true;
        particles = [];
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
      else {
        paused = false;
        if (enabled && images.length > 0) {
          lastTime = 0;
          animFrames.push(requestAnimationFrame(animate));
        }
      }
    }

    function applyState() {
      container = document.getElementById('bounce-images-container');
      if (!container) return;
      if (enabled && images.length > 0) {
        container.hidden = false;
        renderBounceImages();
      } else {
        container.hidden = true;
        animFrames.forEach(function (id) { cancelAnimationFrame(id); });
        animFrames = [];
      }
    }

    return {
      init: function () {
        container = document.getElementById('bounce-images-container');
        var savedEn = StorageService.get(StorageService.KEY_BOUNCE_ENABLED);
        var savedSp = StorageService.get(StorageService.KEY_BOUNCE_SPEED);
        var savedSz = StorageService.get(StorageService.KEY_BOUNCE_SIZE);
        if (savedEn !== null) enabled = !!savedEn;
        if (savedSp !== null && typeof savedSp === 'number') speed = savedSp;
        if (savedSz !== null && typeof savedSz === 'number') imageSize = savedSz;
        if (window.matchMedia && typeof window.matchMedia === 'function') {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) enabled = false;
        }
        dbGetAll().then(function (rows) {
          rows.forEach(function (row) {
            var url = blobToUrl(row.blob);
            if (url) images.push({ id: row.id, blob: row.blob, url: url });
          });
          renderThumbnails();
          applyState();
        }).catch(function () { applyState(); });

        var bounceToggle = document.getElementById('bounce-toggle');
        if (bounceToggle) {
          bounceToggle.addEventListener('click', function () {
            enabled = !enabled;
            StorageService.set(StorageService.KEY_BOUNCE_ENABLED, enabled);
            var checkEl = document.getElementById('bounce-enabled-check');
            if (checkEl) checkEl.checked = enabled;
            applyState();
            ToastModule.info('Bounce images ' + (enabled ? 'enabled' : 'disabled'));
          });
        }

        var checkEl = document.getElementById('bounce-enabled-check');
        if (checkEl) {
          checkEl.checked = enabled;
          checkEl.addEventListener('change', function () {
            enabled = checkEl.checked;
            StorageService.set(StorageService.KEY_BOUNCE_ENABLED, enabled);
            applyState();
          });
        }

        var sliderEl = document.getElementById('bounce-speed-slider');
        var speedValEl = document.getElementById('bounce-speed-val');
        if (sliderEl && speedValEl) {
          sliderEl.value = speed;
          speedValEl.textContent = speed + 's';
          sliderEl.addEventListener('input', function () {
            speed = parseFloat(sliderEl.value);
            speedValEl.textContent = speed + 's';
            StorageService.set(StorageService.KEY_BOUNCE_SPEED, speed);
          });
        }

        var sizeSliderEl = document.getElementById('bounce-size-slider');
        var sizeValEl = document.getElementById('bounce-size-val');
        if (sizeSliderEl && sizeValEl) {
          sizeSliderEl.value = imageSize;
          sizeValEl.textContent = imageSize + 'px';
          sizeSliderEl.addEventListener('input', function () {
            imageSize = parseInt(sizeSliderEl.value, 10);
            sizeValEl.textContent = imageSize + 'px';
            StorageService.set(StorageService.KEY_BOUNCE_SIZE, imageSize);
            document.documentElement.style.setProperty('--bounce-size', imageSize + 'px');
            if (enabled && images.length > 0) renderBounceImages();
          });
        }
        document.documentElement.style.setProperty('--bounce-size', imageSize + 'px');

        var uploadBtn = document.getElementById('bounce-upload-btn');
        var uploadInput = document.getElementById('bounce-upload-input');
        if (uploadBtn && uploadInput) {
          uploadBtn.addEventListener('click', function () {
            if (images.length >= MAX_IMAGES) {
              ToastModule.error('Maximum ' + MAX_IMAGES + ' images allowed. Remove one first.');
              return;
            }
            uploadInput.click();
          });
          uploadInput.addEventListener('change', function () {
            var files = uploadInput.files;
            if (!files || files.length === 0) return;
            var remaining = MAX_IMAGES - images.length;
            if (remaining <= 0) {
              ToastModule.error('Maximum ' + MAX_IMAGES + ' images reached.');
              uploadInput.value = '';
              return;
            }
            var toProcess = Math.min(files.length, remaining);
            var errors = [];
            var added = 0;
            function processNext(i) {
              if (i >= toProcess) {
                if (errors.length > 0) ToastModule.warning(errors.length + ' file(s) rejected: ' + errors[0]);
                if (added > 0) ToastModule.success(added + ' image(s) added');
                uploadInput.value = '';
                return;
              }
              addImage(files[i]).then(function () { added++; processNext(i + 1); })
                .catch(function (err) { errors.push(err.message || 'Unknown error'); processNext(i + 1); });
            }
            processNext(0);
          });
        }

        window.addEventListener('resize', function () {
          resizeCanvas();
          if (enabled && images.length > 0) {
            bouncers.forEach(function (b) {
              if (!b) return;
              b.imgW = b.el.offsetWidth || 80;
              b.imgH = b.el.offsetHeight || 80;
              b.x = Math.min(b.x, window.innerWidth - b.imgW);
              b.y = Math.min(b.y, window.innerHeight - b.imgH);
            });
          }
        });

        document.addEventListener('visibilitychange', onVisibilityChange);
      },
      toggle: function () {
        enabled = !enabled;
        StorageService.set(StorageService.KEY_BOUNCE_ENABLED, enabled);
        applyState();
      },
      isEnabled: function () { return enabled; },
      getCount: function () { return images.length; },
      getSpeed: function () { return speed; },
      validateFile: validateFile,
      MAX_IMAGES: MAX_IMAGES,
      MAX_FILE_SIZE: MAX_FILE_SIZE,
      ALLOWED_TYPES: ALLOWED_TYPES
    };
  }());



  /**
 * @module ThemeCustomizer
 * @description 6 presets + 6 custom color pickers.
 */
var ThemeCustomizer = (function () {
    var PRESETS = {
      'default-dark': {
        '--bg-primary': '#050C16',
        '--bg-card': '#071220',
        '--text-primary': '#E0EBF5',
        '--cyan': '#00D4FF',
        '--orange': '#FF8C1A',
        '--scan-color': '#00D4FF'
      },
      'default-light': {
        '--bg-primary': '#EEF2F6',
        '--bg-card': '#FFFFFF',
        '--text-primary': '#0D1B2A',
        '--cyan': '#009DD9',
        '--orange': '#FF7A00',
        '--scan-color': '#009DD9'
      },
      'midnight': {
        '--bg-primary': '#0A0A1A',
        '--bg-card': '#12122A',
        '--text-primary': '#E0E0F0',
        '--cyan': '#7C3AED',
        '--orange': '#FF6B6B',
        '--scan-color': '#7C3AED'
      },
      'high-contrast': {
        '--bg-primary': '#000000',
        '--bg-card': '#111111',
        '--text-primary': '#FFFFFF',
        '--cyan': '#FFFF00',
        '--orange': '#FF4444',
        '--scan-color': '#FFFF00'
      },
      'nord': {
        '--bg-primary': '#2E3440',
        '--bg-card': '#3B4252',
        '--text-primary': '#ECEFF4',
        '--cyan': '#88C0D0',
        '--orange': '#BF616A',
        '--scan-color': '#88C0D0'
      },
      'sunset': {
        '--bg-primary': '#1A0A2E',
        '--bg-card': '#2D1B4E',
        '--text-primary': '#F0E0FF',
        '--cyan': '#FF6B6B',
        '--orange': '#FFD93D',
        '--scan-color': '#FF6B6B'
      }
    };

    function applyVariables(vars) {
      var root = document.documentElement;
      for (var k in vars) {
        if (vars.hasOwnProperty(k)) {
          root.style.setProperty(k, vars[k]);
        }
      }
    }

    function syncPickers() {
      var root = document.documentElement;
      document.querySelectorAll('.color-pickers-grid input[type="color"]').forEach(function (input) {
        var v = input.getAttribute('data-var');
        if (v) {
          var val = getComputedStyle(root).getPropertyValue(v).trim();
          if (val && val.startsWith('#')) input.value = val;
        }
      });
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_CUSTOM_THEME);
        if (saved && typeof saved === 'object') {
          applyVariables(saved);
        }
        setTimeout(syncPickers, 50);

        document.querySelectorAll('.theme-preset-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var preset = btn.getAttribute('data-preset');
            if (PRESETS[preset]) {
              applyVariables(PRESETS[preset]);
              StorageService.set(StorageService.KEY_CUSTOM_THEME, PRESETS[preset]);
              document.querySelectorAll('.theme-preset-btn').forEach(function (b) { b.classList.remove('active'); });
              btn.classList.add('active');
              syncPickers();
              ToastModule.success('Theme preset armed: ' + preset.toUpperCase());
            }
          });
        });

        document.querySelectorAll('.color-pickers-grid input[type="color"]').forEach(function (input) {
          input.addEventListener('input', function () {
            var v = input.getAttribute('data-var');
            if (v) {
              document.documentElement.style.setProperty(v, input.value);
              var cur = StorageService.get(StorageService.KEY_CUSTOM_THEME) || {};
              cur[v] = input.value;
              StorageService.set(StorageService.KEY_CUSTOM_THEME, cur);
            }
          });
        });

        var resetBtn = document.getElementById('theme-reset-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            var cur = StorageService.get(StorageService.KEY_CUSTOM_THEME) || {};
            Object.keys(cur).forEach(function (k) {
              document.documentElement.style.removeProperty(k);
            });
            StorageService.remove(StorageService.KEY_CUSTOM_THEME);
            syncPickers();
            ToastModule.info('Custom theme reset to defaults');
          });
        }
      },
      syncPickers: syncPickers
    };
  }());

  /**
 * @module ToastModule
 * @description HUD-style toast notification system.
 */
var ToastModule = (function () {
    var container = null;

    function getContainer() {
      if (!container) {
        container = document.querySelector('.toast-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'toast-container';
          document.body.appendChild(container);
        }
      }
      return container;
    }

    function show(msg, type, onClick) {
      var c = getContainer();
      var toast = document.createElement('div');
      toast.className = 'toast toast-' + (type || 'info');
      if (onClick) toast.style.cursor = 'pointer';
      toast.textContent = msg;

      if (onClick) {
        toast.addEventListener('click', function () {
          onClick();
          toast.classList.remove('toast-visible');
          toast.classList.add('toast-exit');
          setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 300);
        });
      }

      c.appendChild(toast);
      var rAF = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame : function (fn) { setTimeout(fn, 16); };
      rAF(function () {
        toast.classList.add('toast-visible');
      });

      setTimeout(function () {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-exit');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, 3200);
    }

    return {
      success: function (msg, onClick) { show(msg, 'success', onClick); },
      error:   function (msg, onClick) { show(msg, 'error', onClick); },
      info:    function (msg, onClick) { show(msg, 'info', onClick); }
    };
  }());

  /**
 * @module KeyboardModule
 * @description Global keyboard hotkey handler.
 */
var KeyboardModule = (function () {
    return {
      init: function () {
        document.addEventListener('keydown', function (e) {
          var tag = (e.target.tagName || '').toLowerCase();
          var isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

          if (e.key === 'Escape') {
            LinksModule.closeAddModal();
            SettingsModule.closePanel();
            var alarmModal = document.getElementById('alarm-modal');
            if (alarmModal) alarmModal.hidden = true;
            return;
          }

          if (isInput) return;

          if (e.code === 'Space') {
            e.preventDefault();
            var state = TimerModule.getState();
            if (state.status === 'running') TimerModule.stop();
            else TimerModule.start();
          } else if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            var todoInput = document.getElementById('todo-input');
            if (todoInput) todoInput.focus();
          } else if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            LinksModule.openAddModal();
          } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            SettingsModule.openPanel();
          }
        });
      }
    };
  }());

  /**
 * @module ProfilePhotoModule
 * @description Click-to-upload circular profile photo.
 */
/* ProfilePhotoModule — Click-to-upload profile photo */
  var ProfilePhotoModule = (function () {
    var KEY = 'pd_profile_photo';
    return {
      init: function () {
        var wrap = document.getElementById('profile-photo-wrap');
        var img = document.getElementById('profile-photo-img');
        var placeholder = document.getElementById('profile-photo-placeholder');
        var input = document.getElementById('profile-photo-input');
        if (!wrap || !img || !input) return;

        // Load saved photo
        var saved = StorageService.get(KEY);
        if (saved) {
          img.src = saved;
          img.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
        }

        // Click to upload
        wrap.addEventListener('click', function () {
          input.click();
        });

        // Handle file selection
        input.addEventListener('change', function () {
          var file = input.files[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            ToastModule.error('Photo must be under 2MB');
            return;
          }
          if (!file.type.startsWith('image/')) {
            ToastModule.error('Please select an image file');
            return;
          }
          var reader = new FileReader();
          reader.onload = function (e) {
            img.src = e.target.result;
            img.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            StorageService.set(KEY, e.target.result);
            ToastModule.success('Profile photo updated');
          };
          reader.readAsDataURL(file);
          input.value = '';
        });
      }
    };
  }());

  /**
 * @module ClearViewModule
 * @description Hides cards to show only navbar and images.
 */
var ClearViewModule = (function () {
    var isActive = false;
    var targets = ['.terminal-wrapper > .tactical-card', '.terminal-wrapper > .middle-grid',
                   '.terminal-wrapper > .palette-accordion', '.terminal-wrapper > footer',
                   '.terminal-wrapper > .banner-card'];
    function apply() {
      targets.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.style.display = isActive ? 'none' : '';
          el.style.opacity = isActive ? '0' : '';
          el.style.transition = 'opacity 0.3s ease';
        });
      });
      var wrapper = document.querySelector('.terminal-wrapper');
      if (wrapper) {
        wrapper.style.paddingBottom = isActive ? '0' : '';
      }
      var toggle = document.getElementById('clear-view-toggle');
      if (toggle) toggle.classList.toggle('active-clear', isActive);
    }
    return {
      init: function () {
        var btn = document.getElementById('clear-view-toggle');
        if (btn) btn.addEventListener('click', function() {
          isActive = !isActive;
          apply();
          ToastModule.info(isActive ? 'Clear view: floating images only' : 'Clear view: off');
        });
      }
    };
  }());

/**
 * @module PWAModule
 * @description Progressive Web App: service-worker registration, install
 *   prompt, and update notification via ToastModule.
 */
var PWAModule = (function () {
    var deferredPrompt = null;
    var registration = null;

    /* ---- dynamic theme-color ---- */
    function syncThemeColor() {
        try {
            var theme = document.documentElement.getAttribute('data-theme');
            var color = theme === 'light' ? '#EEF2F6' : '#0A0D18';
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', color);
        } catch (_) { /* non-critical */ }
    }

    /* ---- show install banner ---- */
    function showInstallBanner() {
        ToastModule.info('Install "Our Time" for quick access', function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function (result) {
                if (result.outcome === 'accepted') {
                    ToastModule.success('App installed!');
                }
                deferredPrompt = null;
            });
        });
    }

    /* ---- show update banner ---- */
    function showUpdateBanner() {
        ToastModule.info('Update available \u2014 click to refresh', function () {
            if (!registration || !registration.waiting) return;
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
    }

    return {
        /** @description Register SW and wire up install / update toasts. */
        init: function () {
            if (!('serviceWorker' in navigator)) {
                console.warn('[PWA] Service workers not supported');
                return;
            }

            navigator.serviceWorker.register('./sw.js')
                .then(function (reg) {
                    registration = reg;
                    console.info('[PWA] Service worker registered, scope:', reg.scope);

                    /* Listen for a new SW taking over */
                    reg.addEventListener('updatefound', function () {
                        var sw = reg.installing;
                        if (!sw) return;
                        sw.addEventListener('statechange', function () {
                            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateBanner();
                            }
                        });
                    });
                })
                .catch(function (err) {
                    console.warn('[PWA] Registration failed:', err);
                });

            /* ---- beforeinstallprompt (Chrome / Edge) ---- */
            window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                deferredPrompt = e;
                /* Show the navbar download button */
                var btn = document.getElementById('pwa-install-btn');
                if (btn) {
                    btn.hidden = false;
                    btn.addEventListener('click', function () {
                        if (!deferredPrompt) return;
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then(function (result) {
                            if (result.outcome === 'accepted') {
                                ToastModule.success('App installed!');
                                btn.hidden = true;
                            }
                            deferredPrompt = null;
                        });
                    });
                }
                /* Delay toast slightly to avoid clutter on first load */
                setTimeout(showInstallBanner, 5000);
            });

            /* ---- track installation ---- */
            window.addEventListener('appinstalled', function () {
                deferredPrompt = null;
                var btn = document.getElementById('pwa-install-btn');
                if (btn) btn.hidden = true;
                ToastModule.success('Our Time is now installed!');
            });

            /* ---- detect standalone mode ---- */
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
                var btn = document.getElementById('pwa-install-btn');
                if (btn) btn.hidden = true;
                console.info('[PWA] Running in standalone mode');
            }

            /* ---- sync theme-color on every theme toggle ---- */
            var observer = new MutationObserver(syncThemeColor);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
            syncThemeColor();
        }
    };
}());

  var App = {
    init: function () {
      ThemeModule.init();
      GreetingModule.init();
      SoundModule.init();
      TimerModule.init();
      TodoModule.init();
      LinksModule.init();
      SettingsModule.init();
      BounceImages.init();
      AlarmSystem.init();
      AlarmUI.init();
      ThemeCustomizer.init();
      SFXModule.init();
      KeyboardModule.init();
      ProfilePhotoModule.init();
      ClearViewModule.init();
      PWAModule.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }

  // Pure functions export for testing
  window._testExports = {
    pad2: pad2,
    getGreeting: getGreeting,
    format12HourTime: format12HourTime,
    formatMMSS: formatMMSS,
    normalizeUrl: normalizeUrl,
    calculateEfficiency: calculateEfficiency,
    isValidUrl: isValidUrl,
    validateBounceFile: (typeof BounceImages !== "undefined") ? BounceImages.validateFile : null,
    BOUNCE_MAX_IMAGES: 5,
    BOUNCE_MAX_FILE_SIZE: 2 * 1024 * 1024
  };

})();
