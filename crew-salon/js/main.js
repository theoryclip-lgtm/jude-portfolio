/* ==========================================================================
   Crew Salon — main.js
   No framework, no build step. Loaded with `defer` on every page.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // read a duration token out of the stylesheet so JS timing cannot drift
  // from CSS timing when someone edits one and forgets the other
  function cssMs(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!v) return fallback;
    if (v.indexOf('ms') > -1) return parseFloat(v) || fallback;
    if (v.indexOf('s') > -1) return (parseFloat(v) || 0) * 1000 || fallback;
    return fallback;
  }

  /* ========================================================================
     1. BOOKING — the only place a booking URL should ever be written.
     ========================================================================

     Set BOOKING_URL once the salon's booking system is chosen (Square,
     Boulevard, GlossGenius, Vagaro, Fresha...). Every "Book" link and button
     on every page is driven from this one constant.

     While it is an empty string, booking links keep their fallback href
     (the on-page #book section) so the site never ships a dead link.
  */
  var BOOKING_URL = '';

  /* Per-stylist booking links. Keys must match the `data-stylist` attribute
     on the team cards in team.html. Leave a value empty to fall back to
     BOOKING_URL. Example:
       'jane-doe': 'https://booking.example.com/stylist/jane'
  */
  var STYLIST_BOOKING = {
    'stylist-1': '',
    'stylist-2': '',
    'stylist-3': '',
    'stylist-4': ''
  };

  function applyBookingLinks() {
    // generic booking links/buttons
    var links = document.querySelectorAll('[data-book]');
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      var key = el.getAttribute('data-stylist');
      var url = '';

      if (key && Object.prototype.hasOwnProperty.call(STYLIST_BOOKING, key)) {
        url = STYLIST_BOOKING[key] || BOOKING_URL;
      } else {
        url = BOOKING_URL;
      }

      if (url) {
        el.setAttribute('href', url);
        // a booking system is almost always a third party — open in a new tab
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      }
    }
  }

  /* ========================================================================
     2. Current page — keeps the shared header byte-identical across pages
     while still marking the active nav item.
     ======================================================================== */

  function markCurrentPage() {
    var path = window.location.pathname.replace(/\/+$/, '');
    var file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    var items = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < items.length; i++) {
      var href = items[i].getAttribute('href');
      if (href === file) {
        items[i].setAttribute('aria-current', 'page');
      }
    }
  }

  /* ========================================================================
     3. Mobile navigation — a real disclosure.
        aria-expanded on the trigger, Escape closes, focus trapped while open,
        focus returned to the trigger on close.
     ======================================================================== */

  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.getElementById('nav-panel');
    if (!toggle || !panel) return;

    var mq = window.matchMedia('(max-width: 900px)');

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function focusables() {
      return panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    }

    // display:none cannot be transitioned, so `hidden` comes off first and the
    // [data-open] attribute drives the transition one frame later. On close the
    // reverse: transition out, then hide once it finishes. Guarded by a token
    // so a rapid open/close/open does not hide a panel that is opening again.
    var closeToken = 0;

    function open() {
      closeToken++;
      panel.hidden = false;
      // force a reflow so the browser has a "from" state to transition out of
      void panel.offsetHeight;
      panel.setAttribute('data-open', '');
      toggle.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKeydown);
      var f = focusables();
      if (f.length) f[0].focus();
    }

    function close(returnFocus) {
      var token = ++closeToken;
      panel.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeydown);
      // move focus before the panel is hidden, or the browser drops it to body
      if (returnFocus) toggle.focus();

      var ms = reducedMotion() ? 0 : cssMs('--dur-fast', 140);
      window.setTimeout(function () {
        // another open() ran in the meantime; leave the panel alone
        if (token !== closeToken) return;
        panel.hidden = true;
      }, ms);
    }

    function onKeydown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        close(true);
        return;
      }

      if (e.key !== 'Tab') return;

      var f = focusables();
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) close(true);
      else open();
    });

    // navigating away closes it (also covers same-page anchors)
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a') && isOpen()) close(false);
    });

    // crossing the breakpoint resets state so the desktop nav is never hidden
    function syncToBreakpoint() {
      if (mq.matches) {
        if (!isOpen()) panel.hidden = true;
      } else {
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', onKeydown);
      }
    }

    if (mq.addEventListener) mq.addEventListener('change', syncToBreakpoint);
    else if (mq.addListener) mq.addListener(syncToBreakpoint);

    syncToBreakpoint();
  }

  /* ========================================================================
     4. Hero video.
        Injected only above 700px and only when motion is welcome. A CSS
        `display:none` would still download the file, so the <video> element
        does not exist in the markup at all — the poster is a CSS background
        and renders immediately either way.
     ======================================================================== */

  function initHeroVideo() {
    var media = document.querySelector('.hero-media[data-video]');
    if (!media) return;

    var wideEnough = window.matchMedia('(min-width: 700px)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var injected = false;

    function inject() {
      if (injected || !wideEnough.matches || reduceMotion.matches) return;
      injected = true;

      var base = media.getAttribute('data-video');
      var poster = media.getAttribute('data-poster') || '';

      var video = document.createElement('video');
      // muted + playsinline are both mandatory or iOS refuses to autoplay
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.setAttribute('preload', 'metadata');
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
      if (poster) video.setAttribute('poster', poster);

      var webm = document.createElement('source');
      webm.src = base + '.webm';
      webm.type = 'video/webm';

      var mp4 = document.createElement('source');
      mp4.src = base + '.mp4';
      mp4.type = 'video/mp4';

      // Crossfade in over the poster once there is a frame to show. The poster
      // is a frame of this same footage, so this reads as the image coming to
      // life rather than one element replacing another.
      var reveal = function () { video.setAttribute('data-ready', ''); };
      video.addEventListener('playing', reveal, { once: true });
      video.addEventListener('loadeddata', reveal, { once: true });

      video.appendChild(webm);
      video.appendChild(mp4);
      media.insertBefore(video, media.firstChild);

      // if autoplay is blocked the poster simply stays; nothing else to do
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }

    inject();

    // a resize up from mobile should still get the video
    if (wideEnough.addEventListener) wideEnough.addEventListener('change', inject);
    else if (wideEnough.addListener) wideEnough.addListener(inject);
  }

  /* ========================================================================
     5. Scroll reveals.

        Deliberately excluded: the header, the hero, the proof bar, the sticky
        mobile bar and every booking CTA. Nothing above the fold is ever
        hidden, so the Book button is visible and tappable on first paint
        whether or not this code runs at all.

        The hidden state is added by CSS only once <html> carries
        .reveal-ready, which this function sets. Without JS, or without
        IntersectionObserver, nothing is ever hidden.
     ======================================================================== */

  function initReveals() {
    var targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
    if (!targets.length) return;

    // No IntersectionObserver, or motion is unwelcome: leave everything
    // visible rather than shipping content that can never appear.
    if (!('IntersectionObserver' in window) || reducedMotion()) return;

    document.documentElement.classList.add('reveal-ready');

    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          entries[i].target.setAttribute('data-shown', '');
          io.unobserve(entries[i].target); // reveal once, never re-hide
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    for (var i = 0; i < targets.length; i++) io.observe(targets[i]);

    // Anything already in view on load (short pages, deep links, a restored
    // scroll position) shows immediately without waiting for a scroll event.
    window.requestAnimationFrame(function () {
      for (var j = 0; j < targets.length; j++) {
        var r = targets[j].getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          targets[j].setAttribute('data-shown', '');
          io.unobserve(targets[j]);
        }
      }
    });

    // Failsafe. Some of these groups contain per-stylist booking links, so
    // content must never be able to get stuck at opacity 0. If anything is
    // still hidden after 6s, reveal it regardless of scroll position. In
    // normal use this fires with nothing left to do.
    window.setTimeout(function () {
      for (var k = 0; k < targets.length; k++) {
        if (!targets[k].hasAttribute('data-shown')) {
          targets[k].setAttribute('data-shown', '');
          io.unobserve(targets[k]);
        }
      }
    }, 6000);
  }

  /* ========================================================================
     6. Small conveniences
     ======================================================================== */

  function setYear() {
    var el = document.getElementById('yr');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  // highlight today's row in any hours list
  function markToday() {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var today = days[new Date().getDay()];
    var rows = document.querySelectorAll('[data-day="' + today + '"]');
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute('data-today', '');
    }
  }

  /* ========================================================================
     7. Instagram feed.
     ========================================================================

     Set INSTAGRAM_FEED_URL to a Behold.so JSON feed URL and the six
     placeholder squares on index.html fill themselves from the live account.

     Why Behold and not Instagram's own API: Instagram's Basic Display API was
     shut down in December 2024. What replaced it (Instagram Graph API with
     Instagram Login) needs a Meta developer app, a Business or Creator
     account linked to a Facebook Page, and a long-lived token that expires
     every 60 days and must be refreshed by a server. This site has no server.
     Behold does that refresh for you and hands back plain JSON, which is the
     only version of this that a salon owner can keep running unattended.

     The feed URL is safe to commit. It is a public read-only endpoint; it is
     not an API key and it cannot post, delete or read private data.

     Setup, about five minutes:
       1. Sign in at behold.so with the Instagram account.
       2. Create a feed, then copy the "JSON feed URL" it gives you.
          It looks like https://feeds.behold.so/XXXXXXXXXXXX
       3. Paste it below. Done, nothing else to change.

     Until then the constant stays empty and the hand-written placeholder
     squares are left exactly as they are, so the section never renders
     broken or half-empty.
  */
  var INSTAGRAM_FEED_URL = '';
  var INSTAGRAM_HANDLE = 'crewsalonoc';

  function instagramAlt(post) {
    // Instagram captions are marketing copy, not alt text, but a trimmed
    // caption still beats "Instagram post" for a screen reader. Strip
    // hashtags, which are noise when read aloud.
    var caption = (post.caption || '').replace(/#\S+/g, '').trim();
    if (!caption) return 'Recent work from Crew Salon on Instagram';
    if (caption.length > 120) caption = caption.slice(0, 117).trim() + '...';
    return caption;
  }

  function renderInstagram(posts, grid) {
    var frames = grid.querySelectorAll('.frame');
    var count = Math.min(frames.length, posts.length);
    if (!count) return;

    for (var i = 0; i < count; i++) {
      var post = posts[i];
      // videos have no still of their own in mediaUrl, hence thumbnailUrl
      var src = post.thumbnailUrl || post.mediaUrl;
      if (!src) continue;

      var link = document.createElement('a');
      link.href = post.permalink || ('https://instagram.com/' + INSTAGRAM_HANDLE);
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'ig-item';

      var img = document.createElement('img');
      img.src = src;
      img.alt = instagramAlt(post);
      img.loading = 'lazy';
      img.decoding = 'async';
      // explicit dimensions so the grid never reflows as images arrive
      img.width = 400;
      img.height = 400;

      link.appendChild(img);
      frames[i].textContent = '';
      frames[i].appendChild(link);
      frames[i].classList.add('frame--filled');
    }

    // Drop the "not connected" setup note once the feed is genuinely live,
    // so nobody ships a working feed with a NOT CONNECTED chip under it.
    var note = document.querySelector('[data-ig-note]');
    if (note) note.hidden = true;
  }

  function initInstagram() {
    if (!INSTAGRAM_FEED_URL) return;

    var grid = document.querySelector('.ig-grid');
    if (!grid || !window.fetch) return;

    fetch(INSTAGRAM_FEED_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('feed responded ' + res.status);
        return res.json();
      })
      .then(function (data) {
        // Behold has shipped both a bare array and a { posts: [...] } object.
        // Accept either rather than break on a future format change.
        var posts = Array.isArray(data) ? data : (data && data.posts) || [];
        if (posts.length) renderInstagram(posts, grid);
      })
      .catch(function (err) {
        // Deliberately silent for the visitor: the placeholder squares stay
        // put and the section still reads as intended. A dead feed must
        // never blank out a section of the page.
        if (window.console) console.warn('Instagram feed unavailable:', err.message);
      });
  }

  /* ======================================================================== */

  function init() {
    // booking links first: the primary conversion path should be correct
    // before any decorative work runs
    applyBookingLinks();
    markCurrentPage();
    initNav();
    initHeroVideo();
    setYear();
    markToday();
    initReveals();
    initInstagram();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
