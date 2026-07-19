/* ==========================================================================
   Tungacea — 360° drag-to-rotate plant viewer
   Vanilla, dependency-free. Uses Pointer Events so mouse, trackpad, pen and
   touch share one implementation. Maps horizontal drag distance to
   video.currentTime; ~one viewer width ≈ one full rotation, with wrapping.
   ========================================================================== */
(function () {
  'use strict';

  var AXIS_THRESHOLD = 6; // px before we commit to a gesture direction
  var IDLE_RESUME_MS = 4500; // wait after interaction before idle resumes
  var IDLE_START_DELAY_MS = 2200; // gentle demo shortly after load
  var IDLE_FULL_ROTATION_MS = 85000; // extremely slow idle rotation
  var KEY_STEP_FRACTION = 1 / 40; // ~9° per arrow press
  var SEEK_WATCHDOG_MS = 2600; // if no seek confirmed -> fallback loop

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function Tng360(stage) {
    this.stage = stage;
    this.video = stage.querySelector('video');
    this.hint =
      stage.querySelector('[data-tng-360-hint]') ||
      (stage.parentElement && stage.parentElement.querySelector('[data-tng-360-hint]')) ||
      null;

    this.sensitivity = parseFloat(stage.getAttribute('data-sensitivity')) || 1;
    this.idleEnabled = stage.getAttribute('data-idle') === 'true';
    this.reduce = reduceMotion;

    this.duration = 0;
    this.width = stage.clientWidth || 1;
    this.dragging = false;
    this.pointerId = null;
    this.axis = null; // 'h' | 'v' | null
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;

    this.rafId = null;
    this.pendingTime = null;

    this.idleTimer = null;
    this.idleRAF = null;
    this.idleLast = null;

    this.hasInteracted = false;
    this.seekConfirmed = false;
    this.fallbackMode = false;
    this.watchdog = null;

    // Bind handlers once so add/removeEventListener match.
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onLoadedMeta = this.onLoadedMeta.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
    this.preventDrag = function (e) {
      e.preventDefault();
    };
    this.onResize = this.onResize.bind(this);

    this.init();
  }

  Tng360.prototype.init = function () {
    if (!this.video) return;

    // Hard-guarantee the media contract regardless of markup.
    this.video.muted = true;
    this.video.defaultMuted = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.removeAttribute('controls');
    this.video.controls = false;

    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('keydown', this.onKeyDown);
    this.stage.addEventListener('dragstart', this.preventDrag);
    window.addEventListener('resize', this.onResize);

    this.video.addEventListener('seeked', this.onSeeked);

    if (this.video.readyState >= 1 && isFinite(this.video.duration) && this.video.duration > 0) {
      this.onLoadedMeta();
    } else {
      this.video.addEventListener('loadedmetadata', this.onLoadedMeta);
    }
  };

  Tng360.prototype.onLoadedMeta = function () {
    this.duration = this.video.duration;
    if (!isFinite(this.duration) || this.duration <= 0) {
      this.enableFallback();
      return;
    }
    // Nudge to render an actual first frame (some browsers hold the poster).
    try {
      this.video.currentTime = 0.001;
    } catch (e) {}

    this.startWatchdog();

    if (!this.reduce && this.idleEnabled) {
      this.scheduleIdle(IDLE_START_DELAY_MS);
    }
  };

  Tng360.prototype.onSeeked = function () {
    this.seekConfirmed = true;
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  };

  Tng360.prototype.startWatchdog = function () {
    var self = this;
    this.watchdog = setTimeout(function () {
      if (!self.seekConfirmed) self.enableFallback();
    }, SEEK_WATCHDOG_MS);
  };

  // Fallback: seamless muted loop when interactive seeking is unavailable.
  Tng360.prototype.enableFallback = function () {
    if (this.fallbackMode) return;
    this.fallbackMode = true;
    this.stopIdle();
    this.hideHint();
    this.stage.style.cursor = 'default';
    this.stage.setAttribute('aria-disabled', 'true');

    this.video.loop = true;
    this.video.muted = true;

    if (this.reduce) {
      // Reduced motion: keep a static first frame / poster, no autoplay.
      try {
        this.video.pause();
        this.video.currentTime = 0;
      } catch (e) {}
      return;
    }

    this.video.playbackRate = 0.6;
    var p = this.video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {});
    }
  };

  /* ------------------------------ helpers ------------------------------ */
  Tng360.prototype.wrap = function (t) {
    var d = this.duration;
    return ((t % d) + d) % d;
  };

  Tng360.prototype.requestUpdate = function (time) {
    var self = this;
    this.pendingTime = time;
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(function () {
      self.rafId = null;
      if (self.pendingTime == null) return;
      try {
        self.video.currentTime = self.pendingTime;
      } catch (e) {}
      self.pendingTime = null;
    });
  };

  Tng360.prototype.updateAria = function (time) {
    if (!this.duration) return;
    var deg = Math.round((time / this.duration) * 360) % 360;
    this.stage.setAttribute('aria-valuenow', String(deg));
  };

  Tng360.prototype.markInteracted = function () {
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    this.hideHint();
  };

  Tng360.prototype.hideHint = function () {
    if (this.hint) this.hint.classList.add('tng-360__hint--hidden');
  };

  Tng360.prototype.onResize = function () {
    this.width = this.stage.clientWidth || 1;
  };

  /* --------------------------- idle rotation --------------------------- */
  Tng360.prototype.scheduleIdle = function (delay) {
    if (!this.idleEnabled || this.reduce || this.fallbackMode) return;
    this.stopIdle();
    var self = this;
    this.idleTimer = setTimeout(
      function () {
        self.startIdle();
      },
      delay == null ? IDLE_RESUME_MS : delay
    );
  };

  Tng360.prototype.startIdle = function () {
    if (this.dragging || this.fallbackMode || this.reduce || !this.idleEnabled) return;
    var self = this;
    this.idleLast = null;
    var step = function (ts) {
      if (self.dragging || self.fallbackMode) {
        self.idleRAF = null;
        return;
      }
      if (self.idleLast == null) self.idleLast = ts;
      var dt = ts - self.idleLast;
      self.idleLast = ts;
      var adv = (dt / IDLE_FULL_ROTATION_MS) * self.duration;
      var nt = self.wrap((self.video.currentTime || 0) + adv);
      try {
        self.video.currentTime = nt;
      } catch (e) {}
      self.updateAria(nt);
      self.idleRAF = requestAnimationFrame(step);
    };
    this.idleRAF = requestAnimationFrame(step);
  };

  Tng360.prototype.stopIdle = function () {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.idleRAF) {
      cancelAnimationFrame(this.idleRAF);
      this.idleRAF = null;
    }
    this.idleLast = null;
  };

  /* ------------------------------ pointer ------------------------------ */
  Tng360.prototype.onPointerDown = function (e) {
    if (this.fallbackMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    this.stopIdle();
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = this.video.currentTime || 0;
    this.width = this.stage.clientWidth || 1;
    this.axis = null;

    // Mouse/trackpad have no touch-action ambiguity — commit immediately.
    if (e.pointerType === 'mouse') {
      this.axis = 'h';
      this.beginDrag();
      e.preventDefault();
    }

    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  };

  Tng360.prototype.beginDrag = function () {
    this.dragging = true;
    this.stage.classList.add('is-dragging');
    try {
      this.stage.setPointerCapture(this.pointerId);
    } catch (e) {}
    this.markInteracted();
  };

  Tng360.prototype.onPointerMove = function (e) {
    if (e.pointerId !== this.pointerId) return;
    var dx = e.clientX - this.startX;
    var dy = e.clientY - this.startY;

    if (this.axis === null) {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.axis = 'h';
        this.beginDrag();
      } else {
        // Clearly vertical — release everything so the page scrolls normally.
        this.axis = 'v';
        this.teardownMove();
        return;
      }
    }

    if (this.axis !== 'h') return;

    e.preventDefault();
    var frac = (dx / this.width) * this.sensitivity;
    var nt = this.wrap(this.startTime + frac * this.duration);
    this.requestUpdate(nt);
    this.updateAria(nt);
  };

  Tng360.prototype.onPointerUp = function (e) {
    if (e.pointerId !== this.pointerId) return;
    this.endDrag();
  };

  Tng360.prototype.teardownMove = function () {
    window.removeEventListener('pointermove', this.onPointerMove, { passive: false });
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  };

  Tng360.prototype.endDrag = function () {
    var wasDragging = this.dragging;
    this.dragging = false;
    this.stage.classList.remove('is-dragging');
    try {
      if (this.pointerId != null) this.stage.releasePointerCapture(this.pointerId);
    } catch (e) {}
    this.teardownMove();
    this.pointerId = null;
    this.axis = null;
    if (wasDragging) this.scheduleIdle();
  };

  /* ----------------------------- keyboard ------------------------------ */
  Tng360.prototype.onKeyDown = function (e) {
    if (this.fallbackMode || !this.duration) return;
    var dir = 0;
    if (e.key === 'ArrowRight') dir = 1;
    else if (e.key === 'ArrowLeft') dir = -1;
    else return;
    e.preventDefault();
    this.stopIdle();
    this.markInteracted();
    var nt = this.wrap((this.video.currentTime || 0) + dir * this.duration * KEY_STEP_FRACTION);
    this.requestUpdate(nt);
    this.updateAria(nt);
    this.scheduleIdle();
  };

  /* ----------------------------- teardown ------------------------------ */
  Tng360.prototype.destroy = function () {
    this.stopIdle();
    this.teardownMove();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.watchdog) clearTimeout(this.watchdog);
    this.stage.removeEventListener('pointerdown', this.onPointerDown);
    this.stage.removeEventListener('keydown', this.onKeyDown);
    this.stage.removeEventListener('dragstart', this.preventDrag);
    window.removeEventListener('resize', this.onResize);
    if (this.video) {
      this.video.removeEventListener('loadedmetadata', this.onLoadedMeta);
      this.video.removeEventListener('seeked', this.onSeeked);
    }
  };

  /* ------------------------------- init -------------------------------- */
  function initAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-tng-360]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.__tng360) continue;
      el.__tng360 = new Tng360(el);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  // Theme editor lifecycle.
  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var nodes = e.target.querySelectorAll('[data-tng-360]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].__tng360) {
        nodes[i].__tng360.destroy();
        nodes[i].__tng360 = null;
      }
    }
  });
})();
