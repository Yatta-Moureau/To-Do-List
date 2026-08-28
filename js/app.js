// Rhodes Island Operator Dashboard — app.js
// Single IIFE encapsulating all application state and logic.
// No external dependencies — fully self-contained.

(function () {
  'use strict';

  /* ============================================================
     StorageService — localStorage wrapper
     ============================================================ */

  var StorageService = Object.freeze({
    KEY_THEME:             'pd_theme',
    KEY_NAME:              'pd_user_name',
    KEY_POMODORO_DURATION: 'pd_pomodoro_duration',
    KEY_TODOS:             'pd_todos',
    KEY_LINKS:             'pd_links',

    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) { return null; }
        return JSON.parse(raw);
      } catch (e) { return null; }
    },

    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    },

    remove: function (key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) { return false; }
    }
  });

  /* ============================================================
     ThemeModule — toggle, persist, auto-detect, and apply theme
     ============================================================ */

  var ThemeModule = (function () {

    function applyTheme(theme) {
      var normalised = (theme === 'dark') ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', normalised);

      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.setAttribute('aria-label',
          normalised === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
      }
    }

    /**
     * Determine theme based on current hour.
     * Evening/night (17-06) → dark, Day (07-16) → light
     */
    function autoDetectTheme() {
      var hour = new Date().getHours();
      return (hour >= 17 || hour < 7) ? 'dark' : 'light';
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_THEME);
        // If user has never toggled, auto-detect; otherwise use saved
        var theme;
        if (saved === 'light' || saved === 'dark') {
          theme = saved;
        } else {
          theme = autoDetectTheme();
        }
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
        applyTheme(next);
      }
    };
  }());

  /* ============================================================
     GreetingModule — live clock with seconds, date, greeting
     ============================================================ */

  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11)  { return 'Good morning'; }
    if (hour >= 12 && hour <= 16) { return 'Good afternoon'; }
    if (hour >= 17 && hour <= 20) { return 'Good evening'; }
    return 'Good night';
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDate(date) {
    var WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var MONTHS   = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return WEEKDAYS[date.getDay()] + ', ' + date.getDate() + ' ' +
           MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  var GreetingModule = (function () {
    var secondTimer = null;

    function render() {
      var now = new Date();

      // Update time with seconds ( HH:MM:SS with blinking colons )
      var timeEl = document.getElementById('header-time');
      if (timeEl) {
        var h = pad2(now.getHours());
        var m = pad2(now.getMinutes());
        var s = pad2(now.getSeconds());
        timeEl.innerHTML = h + '<span class="colon">:</span>' + m +
          '<span class="seconds-display">:<span class="colon">' + s.charAt(0) + '</span>' + s.charAt(1) + '</span>';
      }

      var dateEl = document.getElementById('header-date');
      if (dateEl) {
        dateEl.textContent = formatDate(now);
      }

      var greetingEl = document.getElementById('header-greeting');
      if (greetingEl) {
        var greeting = getGreeting(now.getHours());
        var name = StorageService.get(StorageService.KEY_NAME);
        if (name && name.trim().length > 0) {
          greeting += ', ' + name.trim();
        } else {
          greeting += ', Operator';
        }
        greetingEl.textContent = greeting;
      }
    }

    return {
      init: function () {
        render();
        secondTimer = setInterval(render, 1000);
      },
      render: render
    };
  }());

  /* ============================================================
     SoundModule — IndexedDB storage for alarm sound
     ============================================================ */

  var SoundModule = (function () {
    var DB_NAME = 'RhodesIslandDB';
    var STORE_NAME = 'sounds';
    var SOUND_KEY = 'alarm';
    var db = null;
    var soundBlob = null;
    var soundUrl = null;
    var soundFileName = null;
    var dbAvailable = true;

    function openDatabase() {
      return new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
          dbAvailable = false;
          reject(new Error('IndexedDB not supported'));
          return;
        }

        var request = window.indexedDB.open(DB_NAME, 1);

        request.onerror = function () {
          dbAvailable = false;
          reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = function (event) {
          db = event.target.result;
          resolve(db);
        };

        request.onupgradeneeded = function (event) {
          var database = event.target.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        };
      });
    }

    function getSoundFromDB() {
      return new Promise(function (resolve, reject) {
        if (!db) { resolve(null); return; }

        var transaction = db.transaction([STORE_NAME], 'readonly');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.get(SOUND_KEY);

        request.onsuccess = function () {
          resolve(request.result || null);
        };

        request.onerror = function () {
          reject(new Error('Failed to read sound from IndexedDB'));
        };
      });
    }

    function saveSoundToDB(blob, fileName) {
      return new Promise(function (resolve, reject) {
        if (!db) { reject(new Error('Database not initialized')); return; }

        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var store = transaction.objectStore(STORE_NAME);
        var record = {
          blob: blob,
          name: fileName,
          timestamp: Date.now()
        };
        var request = store.put(record, SOUND_KEY);

        request.onsuccess = function () {
          resolve();
        };

        request.onerror = function () {
          reject(new Error('Failed to save sound to IndexedDB'));
        };
      });
    }

    function removeSoundFromDB() {
      return new Promise(function (resolve, reject) {
        if (!db) { resolve(); return; }

        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.delete(SOUND_KEY);

        request.onsuccess = function () {
          resolve();
        };

        request.onerror = function () {
          reject(new Error('Failed to remove sound from IndexedDB'));
        };
      });
    }

    function updateUI() {
      var statusEl = document.getElementById('settings-sound-status');
      var previewBtn = document.getElementById('settings-sound-preview');
      var removeBtn = document.getElementById('settings-sound-remove');
      var errorEl = document.getElementById('settings-sound-error');

      if (statusEl) {
        if (soundFileName) {
          statusEl.textContent = 'Custom sound: ' + soundFileName;
          statusEl.style.color = 'var(--cyan)';
        } else {
          statusEl.textContent = 'No custom sound set.';
          statusEl.style.color = 'var(--text-muted)';
        }
      }

      if (previewBtn) {
        previewBtn.disabled = !soundBlob;
      }

      if (removeBtn) {
        removeBtn.disabled = !soundBlob;
      }

      if (errorEl) {
        errorEl.hidden = true;
      }
    }

    function showError(message) {
      var errorEl = document.getElementById('settings-sound-error');
      if (errorEl) {
        if (message) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        } else {
          errorEl.hidden = true;
        }
      }
    }

    return {
      init: function () {
        return openDatabase()
          .then(function () {
            return getSoundFromDB();
          })
          .then(function (record) {
            if (record && record.blob) {
              soundBlob = record.blob;
              soundFileName = record.name || 'alarm.mp3';
              soundUrl = URL.createObjectURL(soundBlob);
            }
            updateUI();
          })
          .catch(function (err) {
            console.warn('SoundModule: IndexedDB unavailable, sound features disabled:', err.message);
            dbAvailable = false;
            var statusEl = document.getElementById('settings-sound-status');
            if (statusEl) {
              statusEl.textContent = 'Sound storage unavailable (private mode?).';
              statusEl.style.color = 'var(--danger)';
            }
            var previewBtn = document.getElementById('settings-sound-preview');
            var removeBtn = document.getElementById('settings-sound-remove');
            if (previewBtn) previewBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
          });
      },

      saveSound: function (file) {
        if (!file || !file.type.startsWith('audio/')) {
          return Promise.reject(new Error('Please select a valid audio file.'));
        }

        showError('');

        soundBlob = file;
        soundFileName = file.name;
        soundUrl = URL.createObjectURL(soundBlob);

        if (!dbAvailable) {
          updateUI();
          return Promise.resolve();
        }

        return saveSoundToDB(soundBlob, soundFileName)
          .then(function () {
            updateUI();
          })
          .catch(function (err) {
            showError('Failed to save sound: ' + err.message);
            soundBlob = null;
            soundFileName = null;
            if (soundUrl) { URL.revokeObjectURL(soundUrl); soundUrl = null; }
            updateUI();
            throw err;
          });
      },

      loadSound: function () {
        return Promise.resolve(soundBlob ? URL.createObjectURL(soundBlob) : null);
      },

      removeSound: function () {
        showError('');

        if (soundUrl) {
          URL.revokeObjectURL(soundUrl);
          soundUrl = null;
        }
        soundBlob = null;
        soundFileName = null;

        if (!dbAvailable) {
          updateUI();
          return Promise.resolve();
        }

        return removeSoundFromDB()
          .then(function () {
            updateUI();
          })
          .catch(function (err) {
            showError('Failed to remove sound: ' + err.message);
            throw err;
          });
      },

      playSound: function () {
        if (!soundUrl) { return Promise.resolve(); }

        return new Promise(function (resolve) {
          var audio = new Audio(soundUrl);
          audio.volume = 0.8;
          audio.play()
            .then(function () { resolve(); })
            .catch(function (err) {
              console.warn('SoundModule: Failed to play sound:', err);
              resolve();
            });
        });
      },

      hasCustomSound: function () {
        return !!soundBlob;
      },

      getSoundFileName: function () {
        return soundFileName;
      }
    };
  }());

  /* ============================================================
     TimerModule — countdown + segmented progress + sound alarm
     ============================================================ */

  function formatMMSS(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return pad2(minutes) + ':' + pad2(seconds);
  }

  var TimerModule = (function () {
    var state = {
      status: 'IDLE',        // 'IDLE' | 'RUNNING' | 'PAUSED'
      remainingSeconds: 0,
      durationMinutes: 25,
      intervalId: null
    };

    /**
     * Render the segmented bar (25 blocks).
     * Filled segments = remaining minutes (capped to duration).
     */
    function renderSegments() {
      var container = document.getElementById('timer-segments');
      if (!container) return;

      var total = state.durationMinutes;
      var filled = Math.ceil(state.remainingSeconds / 60);

      // Only rebuild DOM if segment count changed (initial or duration change)
      if (container.childElementCount !== total) {
        container.innerHTML = '';
        for (var i = 0; i < total; i++) {
          var seg = document.createElement('div');
          seg.className = 'timer-segment';
          container.appendChild(seg);
        }
      }

      var segments = container.children;
      for (var j = 0; j < total; j++) {
        if (j < filled) {
          segments[j].classList.add('filled');
        } else {
          segments[j].classList.remove('filled');
        }
      }

      // Update badge
      var badge = document.getElementById('timer-segment-count');
      if (badge) {
        badge.textContent = filled;
      }
    }

    function updateDisplay() {
      var display = document.getElementById('timer-display');
      if (display) {
        display.textContent = formatMMSS(state.remainingSeconds);
        display.classList.toggle('timer-running', state.status === 'RUNNING');
        display.classList.toggle('timer-paused', state.status === 'PAUSED');
      }
      renderSegments();
    }

    function clearTimer() {
      if (state.intervalId !== null) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
    }

    function complete() {
      clearTimer();
      state.status = 'IDLE';
      state.remainingSeconds = 0;
      updateDisplay();

      var alertEl = document.getElementById('timer-alert');
      if (alertEl) {
        alertEl.textContent = '⟐ Focus session complete! Take a break, Operator.';
        alertEl.hidden = false;
      }

      // Play custom alarm sound if available
      if (SoundModule.hasCustomSound()) {
        SoundModule.playSound();
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus complete!', { body: 'Time for a break, Operator.' });
      }
    }

    function tick() {
      if (state.status !== 'RUNNING') { return; }
      if (state.remainingSeconds > 0) {
        state.remainingSeconds--;
        updateDisplay();
      }
      if (state.remainingSeconds === 0) { complete(); }
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_POMODORO_DURATION);
        if (saved !== null && typeof saved === 'number' && saved >= 1 && saved <= 120) {
          state.durationMinutes = saved;
        }
        state.remainingSeconds = state.durationMinutes * 60;
        updateDisplay();

        var startBtn = document.getElementById('timer-start');
        var stopBtn  = document.getElementById('timer-stop');
        var resetBtn = document.getElementById('timer-reset');

        if (startBtn)  startBtn.addEventListener('click', TimerModule.start);
        if (stopBtn)   stopBtn.addEventListener('click', TimerModule.stop);
        if (resetBtn)  resetBtn.addEventListener('click', TimerModule.reset);
      },

      start: function () {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        var alertEl = document.getElementById('timer-alert');
        if (alertEl) alertEl.hidden = true;

        if (state.status === 'RUNNING') return;

        if (state.remainingSeconds <= 0) {
          state.remainingSeconds = state.durationMinutes * 60;
        }

        state.status = 'RUNNING';
        clearTimer();
        state.intervalId = setInterval(tick, 1000);
        updateDisplay();
      },

      stop: function () {
        if (state.status !== 'RUNNING') return;
        clearTimer();
        state.status = 'PAUSED';
        updateDisplay();
      },

      reset: function () {
        clearTimer();
        state.status = 'IDLE';
        state.remainingSeconds = state.durationMinutes * 60;
        updateDisplay();
        var alertEl = document.getElementById('timer-alert');
        if (alertEl) alertEl.hidden = true;
      },

      updateDuration: function (minutes) {
        if (minutes >= 1 && minutes <= 120) {
          state.durationMinutes = minutes;
          if (state.status === 'IDLE') {
            state.remainingSeconds = minutes * 60;
            updateDisplay();
          }
        }
      }
    };
  }());

  /* ============================================================
     TodoModule — CRUD + Priority + Sort + Validation
     ============================================================ */

  // Priority weights for sorting: high > med > low
  var PRIORITY_WEIGHT = { high: 3, med: 2, low: 1 };

  function isEmptyText(text) {
    return text.trim().length === 0;
  }

  function isDuplicate(text, tasks) {
    var normalized = text.trim().toLowerCase();
    return tasks.some(function (task) {
      return task.text.toLowerCase() === normalized;
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Sort tasks. Supports: default, alpha-asc, completed-last, priority
   */
  function getSortedTasks(tasks, sortOption) {
    var copy = tasks.slice();

    if (sortOption === 'priority') {
      copy.sort(function (a, b) {
        var wA = PRIORITY_WEIGHT[a.priority || 'low'] || 1;
        var wB = PRIORITY_WEIGHT[b.priority || 'low'] || 1;
        if (wB !== wA) return wB - wA; // high first
        return a.createdAt - b.createdAt;
      });
    } else if (sortOption === 'alpha-asc') {
      copy.sort(function (a, b) {
        var at = a.text.toLowerCase(), bt = b.text.toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return a.createdAt - b.createdAt;
      });
    } else if (sortOption === 'completed-last') {
      copy.sort(function (a, b) {
        var dd = (a.done ? 1 : 0) - (b.done ? 1 : 0);
        if (dd !== 0) return dd;
        return a.createdAt - b.createdAt;
      });
    } else {
      copy.sort(function (a, b) { return a.createdAt - b.createdAt; });
    }

    return copy;
  }

  var TodoModule = (function () {
    var tasks = [];
    var currentSort = 'default';
    var editingId = null;

    function showError(message) {
      var errorEl = document.getElementById('todo-error');
      if (errorEl) {
        if (message) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        } else {
          errorEl.hidden = true;
        }
      }
    }

    function createTaskElement(task) {
      var li = document.createElement('li');
      li.className = 'todo-item';
      li.dataset.id = task.id;
      li.dataset.priority = task.priority || 'low';

      // Checkbox
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.done ? 'incomplete' : 'complete'));
      checkbox.addEventListener('change', function () {
        TodoModule.toggleComplete(task.id);
      });

      if (editingId === task.id) {
        // Edit mode
        var editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'todo-edit-input';
        editInput.value = task.text;
        editInput.maxLength = 200;
        editInput.setAttribute('aria-label', 'Edit task text');

        editInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            TodoModule.saveEdit(task.id, editInput.value);
          } else if (e.key === 'Escape') {
            editingId = null;
            TodoModule.render();
          }
        });

        editInput.addEventListener('blur', function () {
          TodoModule.saveEdit(task.id, editInput.value);
        });

        li.appendChild(checkbox);
        li.appendChild(editInput);
        setTimeout(function () { editInput.focus(); }, 0);
      } else {
        // Priority badge
        var prio = task.priority || 'low';
        var prioBadge = document.createElement('span');
        prioBadge.className = 'priority-badge ' + prio;
        prioBadge.textContent = prio.toUpperCase();

        // Text
        var textSpan = document.createElement('span');
        textSpan.className = 'todo-text' + (task.done ? ' done' : '');
        textSpan.textContent = task.text;

        // Edit button
        var editBtn = document.createElement('button');
        editBtn.innerHTML = '✎';
        editBtn.className = 'icon-button';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);
        editBtn.addEventListener('click', function () {
          editingId = task.id;
          TodoModule.render();
        });

        // Delete button
        var deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.className = 'icon-button';
        deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.text);
        deleteBtn.addEventListener('click', function () {
          TodoModule.deleteTask(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(prioBadge);
        li.appendChild(textSpan);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
      }

      return li;
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_TODOS);
        if (saved !== null && Array.isArray(saved)) {
          tasks = saved;
        } else if (saved !== null) {
          showError('Failed to load tasks. Starting with an empty list.');
          tasks = [];
        }

        TodoModule.render();

        // Wire Add button
        var addBtn = document.getElementById('todo-add');
        if (addBtn) {
          addBtn.addEventListener('click', function () {
            var input = document.getElementById('todo-input');
            if (input) TodoModule.addTask(input.value);
          });
        }

        // Wire Enter key on input
        var input = document.getElementById('todo-input');
        if (input) {
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') TodoModule.addTask(input.value);
          });
        }

        // Wire sort select
        var sortSelect = document.getElementById('todo-sort');
        if (sortSelect) {
          sortSelect.addEventListener('change', function () {
            TodoModule.setSort(sortSelect.value);
          });
        }
      },

      addTask: function (text) {
        showError('');

        if (isEmptyText(text)) {
          showError('Task text cannot be empty.');
          return;
        }
        if (text.length > 200) {
          showError('Task text must be 200 characters or fewer.');
          return;
        }
        if (isDuplicate(text, tasks)) {
          showError('Task already exists.');
          return;
        }

        // Read priority from selector
        var prioSelect = document.getElementById('todo-priority');
        var priority = (prioSelect && prioSelect.value) ? prioSelect.value : 'med';

        var task = {
          id: generateId(),
          text: text.trim(),
          done: false,
          priority: priority,
          createdAt: Date.now()
        };

        tasks.push(task);

        if (!StorageService.set(StorageService.KEY_TODOS, tasks)) {
          tasks.pop();
          showError('Failed to save task. Please try again.');
          return;
        }

        var input = document.getElementById('todo-input');
        if (input) input.value = '';

        ToastModule.success('Task added');
        TodoModule.render();
      },

      editTask: function (id) {
        showError('');
        editingId = id;
        TodoModule.render();
      },

      saveEdit: function (id, newText) {
        showError('');
        if (isEmptyText(newText)) {
          showError('Task text cannot be empty.');
          return;
        }
        if (newText.length > 500) {
          showError('Task text must be 500 characters or fewer.');
          return;
        }

        var task = tasks.find(function (t) { return t.id === id; });
        if (!task) { editingId = null; TodoModule.render(); return; }

        var oldText = task.text;
        task.text = newText.trim();

        if (!StorageService.set(StorageService.KEY_TODOS, tasks)) {
          task.text = oldText;
          showError('Failed to save edit. Please try again.');
        }

        editingId = null;
        TodoModule.render();
      },

      toggleComplete: function (id) {
        showError('');
        var task = tasks.find(function (t) { return t.id === id; });
        if (!task) return;

        var wasDone = task.done;
        task.done = !task.done;

        if (!StorageService.set(StorageService.KEY_TODOS, tasks)) {
          task.done = wasDone;
          showError('Failed to update task. Please try again.');
          return;
        }

        // Show toast on completion
        if (!wasDone && task.done) {
          ToastModule.success('Task completed: ' + task.text);
        }

        TodoModule.render();
      },

      deleteTask: function (id) {
        showError('');
        var index = tasks.findIndex(function (t) { return t.id === id; });
        if (index === -1) return;

        var task = tasks[index];
        if (!confirm('Delete task: "' + task.text + '"?')) return;

        var removed = tasks.splice(index, 1)[0];

        if (!StorageService.set(StorageService.KEY_TODOS, tasks)) {
          tasks.splice(index, 0, removed);
          showError('Failed to delete task. Please try again.');
        }

        ToastModule.info('Task removed');
        TodoModule.render();
      },

      setSort: function (option) {
        var valid = ['default','priority','alpha-asc','completed-last'];
        if (valid.indexOf(option) !== -1) {
          currentSort = option;
          TodoModule.render();
        }
      },

      render: function () {
        var list = document.getElementById('todo-list');
        if (!list) return;

        list.innerHTML = '';

        var countEl = document.getElementById('todo-count');
        if (countEl) countEl.textContent = tasks.length;

        if (tasks.length === 0) {
          var empty = document.createElement('li');
          empty.className = 'todo-empty';
          empty.innerHTML = '<span class="todo-empty-icon" aria-hidden="true">⟐</span>' +
            '<span class="todo-empty-text">No tasks yet. Deploy one above.</span>';
          list.appendChild(empty);
          return;
        }

        var sorted = getSortedTasks(tasks, currentSort);
        sorted.forEach(function (task) {
          list.appendChild(createTaskElement(task));
        });
      }
    };
  }());

  /* ============================================================
     LinksModule — quick-link CRUD
     ============================================================ */

  function normalizeUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  }

  var LinksModule = (function () {
    var links = [];

    function showError(message) {
      var errorEl = document.getElementById('links-error');
      if (errorEl) {
        if (message) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        } else {
          errorEl.hidden = true;
        }
      }
    }

    function createLinkElement(link) {
      var wrapper = document.createElement('div');
      wrapper.className = 'link-item';

      var button = document.createElement('a');
      button.href = link.url;
      button.className = 'link-button';
      button.textContent = link.label;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';

      var deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '×';
      deleteBtn.className = 'icon-button';
      deleteBtn.setAttribute('aria-label', 'Delete link: ' + link.label);
      deleteBtn.addEventListener('click', function () {
        LinksModule.deleteLink(link.id);
      });

      wrapper.appendChild(button);
      wrapper.appendChild(deleteBtn);

      return wrapper;
    }

    return {
      init: function () {
        var saved = StorageService.get(StorageService.KEY_LINKS);
        if (saved !== null && Array.isArray(saved)) {
          links = saved;
        } else if (saved !== null) {
          showError('Failed to load links. Starting with an empty list.');
          links = [];
        }

        LinksModule.render();

        var addBtn = document.getElementById('link-add');
        if (addBtn) {
          addBtn.addEventListener('click', function () {
            var labelInput = document.getElementById('link-label-input');
            var urlInput   = document.getElementById('link-url-input');
            if (labelInput && urlInput) {
              LinksModule.addLink(labelInput.value, urlInput.value);
            }
          });
        }

        var urlInput = document.getElementById('link-url-input');
        if (urlInput) {
          urlInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              var labelInput = document.getElementById('link-label-input');
              if (labelInput) LinksModule.addLink(labelInput.value, urlInput.value);
            }
          });
        }
      },

      addLink: function (label, url) {
        showError('');
        if (isEmptyText(label)) { showError('Link label cannot be empty.'); return; }
        if (label.length > 50) { showError('Link label must be 50 characters or fewer.'); return; }
        if (isEmptyText(url)) { showError('Link URL cannot be empty.'); return; }
        if (url.length > 2048) { showError('Link URL must be 2048 characters or fewer.'); return; }

        var link = {
          id: generateId(),
          label: label.trim(),
          url: normalizeUrl(url.trim())
        };

        links.push(link);

        if (!StorageService.set(StorageService.KEY_LINKS, links)) {
          links.pop();
          showError('Failed to save link. Please try again.');
          return;
        }

        var labelInput = document.getElementById('link-label-input');
        var urlInput   = document.getElementById('link-url-input');
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value = '';

        ToastModule.success('Link added');
        LinksModule.render();
      },

      deleteLink: function (id) {
        showError('');
        var index = links.findIndex(function (l) { return l.id === id; });
        if (index === -1) return;

        var removed = links.splice(index, 1)[0];

        if (!StorageService.set(StorageService.KEY_LINKS, links)) {
          links.splice(index, 0, removed);
          showError('Failed to delete link. Please try again.');
        }

        ToastModule.info('Link removed');
        LinksModule.render();
      },

      render: function () {
        var list = document.getElementById('links-list');
        if (!list) return;

        list.innerHTML = '';

        if (links.length === 0) {
          var empty = document.createElement('div');
          empty.className = 'links-empty';
          empty.innerHTML = '<span class="links-empty-icon" aria-hidden="true">⟐</span>' +
            '<span class="links-empty-text">No quick links yet. Deploy one above.</span>';
          list.appendChild(empty);
          return;
        }

        links.forEach(function (link) {
          list.appendChild(createLinkElement(link));
        });
      }
    };
  }());

  /* ============================================================
     SettingsModule — panel open/close, name & duration save, sound
     ============================================================ */

  var SettingsModule = (function () {
    var isOpen = false;

    function showNameError(message) {
      var errorEl = document.getElementById('settings-name-error');
      if (errorEl) {
        if (message) { errorEl.textContent = message; errorEl.hidden = false; }
        else { errorEl.hidden = true; }
      }
    }

    function showDurationError(message) {
      var errorEl = document.getElementById('settings-duration-error');
      if (errorEl) {
        if (message) { errorEl.textContent = message; errorEl.hidden = false; }
        else { errorEl.hidden = true; }
      }
    }

    function openPanel() {
      isOpen = true;
      var panel  = document.getElementById('settings-panel');
      var overlay = document.getElementById('settings-overlay');

      if (panel) { panel.classList.add('settings-panel--open'); panel.setAttribute('aria-hidden', 'false'); }
      if (overlay) overlay.hidden = false;

      var firstFocusable = panel.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) firstFocusable.focus();

      document.addEventListener('keydown', handleKeydown);
    }

    function closePanel() {
      isOpen = false;
      var panel  = document.getElementById('settings-panel');
      var overlay = document.getElementById('settings-overlay');

      if (panel) { panel.classList.remove('settings-panel--open'); panel.setAttribute('aria-hidden', 'true'); }
      if (overlay) overlay.hidden = true;

      document.removeEventListener('keydown', handleKeydown);

      var settingsBtn = document.getElementById('settings-open');
      if (settingsBtn) settingsBtn.focus();
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key === 'Tab' && isOpen) {
        var panel = document.getElementById('settings-panel');
        if (!panel) return;
        var focusable = panel.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }

    return {
      init: function () {
        var nameInput = document.getElementById('settings-name');
        if (nameInput) {
          var savedName = StorageService.get(StorageService.KEY_NAME);
          if (savedName !== null && typeof savedName === 'string') nameInput.value = savedName;
        }

        var durationInput = document.getElementById('settings-duration');
        if (durationInput) {
          var savedDuration = StorageService.get(StorageService.KEY_POMODORO_DURATION);
          durationInput.value = (savedDuration !== null && typeof savedDuration === 'number') ? savedDuration : 25;
        }

        var openBtn  = document.getElementById('settings-open');
        var closeBtn = document.getElementById('settings-close');
        var overlay  = document.getElementById('settings-overlay');

        if (openBtn)  openBtn.addEventListener('click', openPanel);
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        if (overlay)  overlay.addEventListener('click', closePanel);

        var nameSaveBtn     = document.getElementById('settings-name-save');
        var durationSaveBtn = document.getElementById('settings-duration-save');

        if (nameSaveBtn) {
          nameSaveBtn.addEventListener('click', function () {
            SettingsModule.saveName(nameInput.value);
          });
        }
        if (durationSaveBtn) {
          durationSaveBtn.addEventListener('click', function () {
            SettingsModule.saveDuration(durationInput.value);
          });
        }

        if (nameInput) {
          nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') SettingsModule.saveName(nameInput.value);
          });
        }
        if (durationInput) {
          durationInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') SettingsModule.saveDuration(durationInput.value);
          });
        }

        // Sound controls
        var soundInput = document.getElementById('settings-sound-input');
        var previewBtn = document.getElementById('settings-sound-preview');
        var removeBtn  = document.getElementById('settings-sound-remove');

        if (soundInput) {
          soundInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) {
              SoundModule.saveSound(file);
            }
            // Clear the input so the same file can be selected again
            soundInput.value = '';
          });
        }

        if (previewBtn) {
          previewBtn.addEventListener('click', function () {
            SoundModule.playSound();
          });
        }

        if (removeBtn) {
          removeBtn.addEventListener('click', function () {
            SoundModule.removeSound();
          });
        }
      },

      saveName: function (value) {
        showNameError('');
        var trimmed = value.trim();
        if (trimmed.length > 50) { showNameError('Name must be 50 characters or fewer.'); return; }

        if (trimmed.length === 0) {
          StorageService.remove(StorageService.KEY_NAME);
        } else {
          if (!StorageService.set(StorageService.KEY_NAME, trimmed)) {
            showNameError('Failed to save name. Please try again.');
            return;
          }
        }

        GreetingModule.render();
        ToastModule.success('Codename saved');
        closePanel();
      },

      saveDuration: function (value) {
        showDurationError('');
        var parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 120) {
          showDurationError('Duration must be between 1 and 120 minutes.');
          return;
        }

        if (!StorageService.set(StorageService.KEY_POMODORO_DURATION, parsed)) {
          showDurationError('Failed to save duration. Please try again.');
          return;
        }

        TimerModule.updateDuration(parsed);
        ToastModule.success('Duration updated to ' + parsed + ' min');
        closePanel();
      }
    };
  }());

  /* ============================================================
     PageTitleModule — live clock in browser tab
     ============================================================ */

  var PageTitleModule = (function () {
    var originalTitle = 'Rhodes Island — Operator Dashboard';
    var timerInterval = null;

    function update() {
      var now = new Date();
      var h = pad2(now.getHours());
      var m = pad2(now.getMinutes());
      document.title = h + ':' + m + ' | ' + originalTitle;
    }

    return {
      init: function () {
        update();
        timerInterval = setInterval(update, 10000); // Update every 10 seconds
      }
    };
  }());

  /* ============================================================
     ToastModule — non-intrusive notification toasts
     ============================================================ */

  var ToastModule = (function () {
    var container = null;

    function ensureContainer() {
      if (container) return;
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }

    function show(message, type, duration) {
      ensureContainer();
      type = type || 'info';
      duration = duration || 3000;

      var toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.setAttribute('role', 'status');

      var icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⟐';
      toast.innerHTML = '<span class="toast-icon">' + icon + '</span>' +
        '<span class="toast-message">' + message + '</span>';

      container.appendChild(toast);

      // Trigger enter animation
      requestAnimationFrame(function () {
        toast.classList.add('toast-visible');
      });

      setTimeout(function () {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-exit');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, duration);
    }

    return {
      init: function () { ensureContainer(); },
      success: function (msg, dur) { show(msg, 'success', dur); },
      error:   function (msg, dur) { show(msg, 'error', dur); },
      info:    function (msg, dur) { show(msg, 'info', dur); }
    };
  }());

  /* ============================================================
     KeyboardModule — global shortcuts
     Space = start/stop timer, Escape = close settings
     ============================================================ */

  var KeyboardModule = (function () {
    function isInputFocused() {
      var el = document.activeElement;
      if (!el) return false;
      var tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }

    function handleKeydown(e) {
      // Don't capture when typing in an input
      if (isInputFocused()) return;

      // Space — toggle timer
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        var display = document.getElementById('timer-display');
        if (display && display.classList.contains('timer-running')) {
          TimerModule.stop();
          ToastModule.info('Timer paused');
        } else {
          TimerModule.start();
          ToastModule.success('Timer started — focus, Operator!');
        }
        return;
      }

      // N — focus new task input
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        var todoInput = document.getElementById('todo-input');
        if (todoInput) todoInput.focus();
        return;
      }

      // S — open settings
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        var settingsOpen = document.getElementById('settings-open');
        var settingsPanel = document.getElementById('settings-panel');
        if (settingsOpen && settingsPanel && !settingsPanel.classList.contains('settings-panel--open')) {
          settingsOpen.click();
        }
        return;
      }
    }

    return {
      init: function () {
        document.addEventListener('keydown', handleKeydown);
      }
    };
  }());

  /* ============================================================
     DataExportImport — backup and restore all data as JSON
     ============================================================ */

  var DataExportImport = (function () {

    function exportData() {
      var data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        theme: StorageService.get(StorageService.KEY_THEME),
        name: StorageService.get(StorageService.KEY_NAME),
        duration: StorageService.get(StorageService.KEY_POMODORO_DURATION),
        todos: StorageService.get(StorageService.KEY_TODOS),
        links: StorageService.get(StorageService.KEY_LINKS)
      };

      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;
      a.download = 'rhodes-island-backup-' +
        new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      ToastModule.success('Data exported successfully');
    }

    function importData(file) {
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);

          if (!data || typeof data !== 'object') {
            ToastModule.error('Invalid backup file');
            return;
          }

          var count = 0;

          if (data.theme) {
            StorageService.set(StorageService.KEY_THEME, data.theme);
            count++;
          }
          if (data.name !== undefined) {
            if (data.name === null) {
              StorageService.remove(StorageService.KEY_NAME);
            } else {
              StorageService.set(StorageService.KEY_NAME, data.name);
            }
            count++;
          }
          if (data.duration) {
            StorageService.set(StorageService.KEY_POMODORO_DURATION, data.duration);
            count++;
          }
          if (Array.isArray(data.todos)) {
            StorageService.set(StorageService.KEY_TODOS, data.todos);
            count++;
          }
          if (Array.isArray(data.links)) {
            StorageService.set(StorageService.KEY_LINKS, data.links);
            count++;
          }

          ToastModule.success('Imported ' + count + ' data fields. Reloading...');

          // Reload after a brief delay so user sees the toast
          setTimeout(function () {
            location.reload();
          }, 1200);

        } catch (err) {
          ToastModule.error('Failed to parse backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    return {
      init: function () {
        var exportBtn = document.getElementById('data-export-btn');
        var importInput = document.getElementById('data-import-input');
        var importBtn = document.getElementById('data-import-btn');

        if (exportBtn) {
          exportBtn.addEventListener('click', exportData);
        }

        if (importInput) {
          importInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) importData(file);
            importInput.value = '';
          });
        }

        if (importBtn && importInput) {
          importBtn.addEventListener('click', function () {
            importInput.click();
          });
        }
      }
    };
  }());

  /* ============================================================
     App.init() — bootstrap all modules
     ============================================================ */

  var App = {
    init: function () {
      ThemeModule.init();
      GreetingModule.init();
      TimerModule.init();
      TodoModule.init();
      LinksModule.init();
      SettingsModule.init();
      SoundModule.init();
      PageTitleModule.init();
      ToastModule.init();
      KeyboardModule.init();
      DataExportImport.init();
    }
  };

  document.addEventListener('DOMContentLoaded', App.init);

  /* ============================================================
     _testExports — pure functions for testing
     ============================================================ */

  window._testExports = {
    getGreeting:    getGreeting,
    formatDate:     formatDate,
    pad2:           pad2,
    formatMMSS:     formatMMSS,
    isEmptyText:    isEmptyText,
    isDuplicate:    isDuplicate,
    generateId:     generateId,
    getSortedTasks: getSortedTasks,
    normalizeUrl:   normalizeUrl,
    PRIORITY_WEIGHT: PRIORITY_WEIGHT
  };

})();