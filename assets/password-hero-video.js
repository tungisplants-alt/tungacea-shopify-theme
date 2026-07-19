/* Tungacea — ambient hero background video.
   Keeps the muted autoplay loop playing where the browser permits and pauses it
   when the page is hidden. If autoplay is blocked, the <video> poster (the
   original approved hero image) stays visible — no controls, no play button. */
(function () {
  'use strict';

  function setup(video) {
    if (!video || video.__tngHero) return;
    video.__tngHero = true;

    // Guarantee the muted contract required for autoplay.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;

    var tryPlay = function () {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    };

    tryPlay();
    video.addEventListener('canplay', tryPlay, { once: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        video.pause();
      } else {
        tryPlay();
      }
    });
  }

  function init(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var vids = scope.querySelectorAll('.tungacea-hero-video');
    for (var i = 0; i < vids.length; i++) setup(vids[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }

  // Theme editor: re-init when the section reloads.
  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });
})();
