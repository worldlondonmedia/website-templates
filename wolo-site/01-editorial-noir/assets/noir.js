/* =====================================================================
   WORLD LONDON MEDIA · Editorial Noir
   Paylasilan JS (tum sayfalar bunu EN SONDA linkler: assets/noir.js)
   NOT: GSAP / ScrollTrigger / Lenis CDN'lerini bu dosya YUKLEMEZ.
   Onlar her HTML <head>'inde defer ile yuklenir, noir.js en sonda calisir.

   Icerik:
   - Lenis + GSAP + ScrollTrigger init & senkron (fail-safe)
   - Custom cursor (damping ~0.08)
   - Reveal (ScrollTrigger once) + counters + marquee velocity
   - Lightbox (openLightbox/closeLightbox + focus-trap inert + Esc + simetrik kapanis)
   - Nav active + sticky scrolled + mobil menu
   - setLang (data-en/data-tr + localStorage + toggle, varsayilan EN)
   - SAYFA GECISLERI (exit overlay -> navigate; load -> entrance)
   - FAIL-SAFE (GSAP/Lenis yoksa: reveal gorunur, counters son deger, native scroll)
   ===================================================================== */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Lenis instance disariya tasinir (sayfa-gecis + lightbox kullansin) */
  var lenis = null;

  /* =================================================================
     i18n: setLang her sayfa data-en/data-tr attribute'lerini uygular.
     Varsayilan EN. localStorage 'wolo-lang' icinde tutulur.
     ================================================================= */
  function applyLangTo(el, lang) {
    var val = (lang === 'tr') ? el.getAttribute('data-tr') : el.getAttribute('data-en');
    if (val === null || val === undefined) return;
    // <br/>, <em> gibi inline isaretleme destegi icin innerHTML
    el.innerHTML = val;
  }

  window.setLang = function setLang(lang) {
    if (lang !== 'tr') lang = 'en';
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) applyLangTo(nodes[i], lang);
    var btns = document.querySelectorAll('.lang-toggle button');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('active', btns[j].getAttribute('data-l') === lang);
      btns[j].setAttribute('aria-pressed', btns[j].getAttribute('data-l') === lang ? 'true' : 'false');
    }
    try { localStorage.setItem('wolo-lang', lang); } catch (e) {}
  };

  function initLang() {
    var saved = 'en';
    try { saved = localStorage.getItem('wolo-lang') || 'en'; } catch (e) {}
    window.setLang(saved);
  }

  /* =================================================================
     NAV: active link, sticky scrolled state, mobil menu toggle
     ================================================================= */
  function initNav() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    // aktif sayfa: current path dosya adina gore .active + aria-current
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var links = nav.querySelectorAll('.nav-links a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href) continue;
      var file = href.split('/').pop();
      if (file === path || (path === '' && file === 'index.html')) {
        links[i].classList.add('active');
        links[i].setAttribute('aria-current', 'page');
      }
    }

    // mobil menu toggle
    var toggle = nav.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // link tiklayinca menuyu kapat (gecis JS ayri devralir)
      for (var k = 0; k < links.length; k++) {
        links[k].addEventListener('click', function () { nav.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); });
      }
    }
  }

  /* =================================================================
     SAYFA GECISLERI: ic .html linkine tiklayinca exit overlay sweep,
     sonra navigate. Yeni sayfa load olunca entrance sweep.
     reduced-motion: aninda gec (overlay CSS'te display:none).
     ================================================================= */
  function getTransitionEl() {
    var el = document.querySelector('.page-transition');
    if (!el) {
      el = document.createElement('div');
      el.className = 'page-transition';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="pt-panel"></div><div class="pt-mark">World <em>London</em> Media</div>';
      document.body.appendChild(el);
    }
    return el;
  }

  function isInternalHtml(a) {
    if (!a) return false;
    var href = a.getAttribute('href');
    if (!href) return false;
    if (a.target === '_blank') return false;
    if (a.hasAttribute('data-no-transition')) return false;
    if (/^(mailto:|tel:|https?:|\/\/|#)/i.test(href)) return false;
    // .html ile biten ya da ../../index.html gibi goreli ic linkler
    return /\.html(\?|#|$)/i.test(href);
  }

  function initPageTransitions() {
    var overlay = getTransitionEl();

    // ENTRANCE: sayfa yuklendiginde panel yukari kayip kaybolur
    if (!prefersReduced) {
      // tarayici geri/ileri bfcache'ten gelirse overlay'i sifirla
      window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
          overlay.className = 'page-transition';
        }
      });

      // ic link tiklamasi -> exit sweep -> navigate
      document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        if (!isInternalHtml(a)) return;
        // ayni sayfa ise birak
        var dest = a.href;
        if (dest === window.location.href) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

        e.preventDefault();
        // rust ya da ink varyant: rastgele degil, deterministik (rust her 3'te bir hissi icin) -> sade ink tut
        overlay.className = 'page-transition is-exit';
        // sweep suresi (CSS .5s) sonunda navigate
        window.setTimeout(function () { window.location.href = dest; }, 480);
      });
    }
  }

  function runEntrance() {
    if (prefersReduced) return;
    var overlay = getTransitionEl();
    // panel ekrani kapali baslat, sonra yukari kaydir
    overlay.className = 'page-transition is-entrance';
    // bir frame sonra cikis animasyonunu tetikle
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.className = 'page-transition is-entrance is-entrance-out';
        window.setTimeout(function () { overlay.className = 'page-transition'; }, 650);
      });
    });
  }

  /* =================================================================
     CUSTOM CURSOR (imza ozelligi, damping ~0.08 akiskan takip)
     ================================================================= */
  function initCursor() {
    if (!hasFinePointer || prefersReduced) return;
    var cursor = document.querySelector('.cursor-noir');
    var label = document.querySelector('.cursor-noir-label');
    if (!cursor || !label) return;

    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var tx = cx, ty = cy;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });

    cursor.style.left = '0'; cursor.style.top = '0';
    label.style.left = '0'; label.style.top = '0';

    function tick() {
      // audit: damping ~0.08 (daha akiskan, gecikmeli takip)
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%, -50%)';
      var sc = label.classList.contains('visible') ? ' scale(1)' : ' scale(0.8)';
      label.style.transform = 'translate(' + cx + 'px, ' + (cy + 30) + 'px) translate(-50%, -50%)' + sc;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    var labels = {
      view:   { en: 'View case', tr: 'Incele' },
      play:   { en: 'Showreel', tr: 'Showreel' },
      expand: { en: '', tr: '' }
    };
    var triggers = document.querySelectorAll('[data-cursor]');
    for (var i = 0; i < triggers.length; i++) {
      (function (el) {
        var type = el.getAttribute('data-cursor');
        if (type === 'ignore') {
          el.addEventListener('mouseenter', function () { cursor.classList.add('expand'); });
          el.addEventListener('mouseleave', function () { cursor.classList.remove('expand'); });
          return;
        }
        el.addEventListener('mouseenter', function () {
          cursor.classList.add('expand');
          var lang = document.documentElement.lang || 'en';
          var txt = el.getAttribute('data-cursor-label') || (labels[type] && labels[type][lang]) || '';
          if (txt) { label.textContent = txt; label.classList.add('visible'); }
        });
        el.addEventListener('mouseleave', function () {
          cursor.classList.remove('expand');
          label.classList.remove('visible');
        });
      })(triggers[i]);
    }

    // scroll halinde cursor karakter degisimi
    var scrollTimer = null;
    function flagScrolling() {
      cursor.classList.add('scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () { cursor.classList.remove('scrolling'); }, 220);
    }
    if (lenis) lenis.on('scroll', flagScrolling);
    else window.addEventListener('scroll', flagScrolling, { passive: true });
  }

  /* =================================================================
     LIGHTBOX (case-study): focus-trap + inert + Esc + simetrik kapanis
     ================================================================= */
  function initLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var main = document.getElementById('main');
    var footer = document.querySelector('.site-footer');
    var nav = document.querySelector('.site-nav');

    var lbImg = document.getElementById('lb-img');
    var lbTitle = document.getElementById('lb-title');
    var lbTag = document.getElementById('lb-tag');
    var lbDesc = document.getElementById('lb-desc');
    var lbTags = document.getElementById('lb-tags');
    var lbClose = lightbox.querySelector('.lightbox-close');
    var lastFocused = null;

    function setInert(on) {
      [main, footer, nav].forEach(function (el) {
        if (!el) return;
        if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
        else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
      });
    }

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      var focusables = lightbox.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    window.openLightbox = function openLightbox(item) {
      var lang = document.documentElement.lang || 'en';
      if (lbImg) { lbImg.src = item.getAttribute('data-lb-img') || ''; lbImg.alt = item.getAttribute('data-lb-title') || ''; }
      if (lbTitle) lbTitle.textContent = item.getAttribute('data-lb-title') || '';
      if (lbTag) lbTag.textContent = item.getAttribute('data-lb-tag') || '';
      if (lbDesc) lbDesc.textContent = (lang === 'tr' ? item.getAttribute('data-lb-desc-tr') : item.getAttribute('data-lb-desc-en')) || item.getAttribute('data-lb-desc-en') || '';
      if (lbTags) {
        lbTags.innerHTML = '';
        (item.getAttribute('data-lb-tags') || '').split(',').forEach(function (t) {
          if (!t.trim()) return;
          var s = document.createElement('span'); s.textContent = t.trim(); lbTags.appendChild(s);
        });
      }
      lastFocused = document.activeElement;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      setInert(true);
      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', trapFocus);
      if (lbClose) lbClose.focus();
    };

    window.closeLightbox = function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      setInert(false);
      if (lenis) lenis.start();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', trapFocus);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    var items = document.querySelectorAll('.work-item');
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.addEventListener('click', function () { window.openLightbox(item); });
        item.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.openLightbox(item); }
        });
      })(items[i]);
    }
    if (lbClose) lbClose.addEventListener('click', window.closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) window.closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) window.closeLightbox();
    });
  }

  /* =================================================================
     SCROLL PROGRESS + BACK TO TOP + NAV scrolled state
     ================================================================= */
  function initScrollChrome() {
    var progress = document.querySelector('.scroll-progress');
    var backTop = document.querySelector('.back-top');
    var nav = document.querySelector('.site-nav');

    function onScroll(scrollY) {
      var y = (typeof scrollY === 'number') ? scrollY : window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = (y / Math.max(max, 1)) * 100;
      if (progress) progress.style.width = pct + '%';
      if (backTop) backTop.classList.toggle('visible', y > 600);
      if (nav) nav.classList.toggle('scrolled', y > 40);
    }
    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else window.addEventListener('scroll', function () { onScroll(); }, { passive: true });
    onScroll(0);

    if (backTop) {
      backTop.addEventListener('click', function () {
        if (lenis) lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }
  }

  /* =================================================================
     ANA INIT (GSAP/Lenis defer ile yuklendi, load sonrasi calisir)
     ================================================================= */
  function init() {
    var hasGSAP = typeof window.gsap !== 'undefined';
    var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
    var hasLenis = typeof window.Lenis !== 'undefined';

    /* ---- LENIS smooth scroll + ScrollTrigger senkron ---- */
    if (hasLenis && !prefersReduced) {
      lenis = new Lenis({
        duration: 1.1,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 1.4
      });
      if (hasST) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    }

    /* ---- SMOOTH ANCHOR (#id linkleri; FAIL-SAFE native scroll) ---- */
    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var a = 0; a < anchors.length; a++) {
      anchors[a].addEventListener('click', function (e) {
        var id = this.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.2 });
        else target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }

    /* ---- REVEAL + SCROLL HAREKET (FAIL-SAFE) ---- */
    if (prefersReduced || !hasST) {
      // reduced-motion veya GSAP yoksa: her sey TAM gorunur, sayaclar son deger
      var rv = document.querySelectorAll('.reveal');
      for (var r = 0; r < rv.length; r++) rv[r].classList.add('in');
      var cn = document.querySelectorAll('.count');
      for (var c = 0; c < cn.length; c++) cn[c].textContent = cn[c].getAttribute('data-to');
    } else {
      gsap.registerPlugin(ScrollTrigger);

      /* Hero baslik word reveal (sinematik, soluk aldiran: stagger .12, delay .25) */
      if (document.querySelector('.hero-line .word')) {
        gsap.set('.hero-line .word', { yPercent: 110 });
        gsap.to('.hero-line .word', { yPercent: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.25 });
        gsap.from('.hero-meta span, .hero-issue span', { opacity: 0, y: 14, duration: 0.9, ease: 'power2.out', stagger: 0.06, delay: 0.55 });
        gsap.from('.hero-image', { opacity: 0, y: 40, scale: 0.97, duration: 1.2, ease: 'power3.out', delay: 0.35 });
        gsap.from('.hero-blurb', { opacity: 0, y: 24, duration: 1, ease: 'power2.out', delay: 0.75 });
      }

      /* Hero poster Ken Burns + parallax: scale ~1.15, yPercent ~14 */
      var poster = document.querySelector('.hero-image .poster');
      if (poster) {
        gsap.to(poster, {
          scale: 1.15, yPercent: 14, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
      }

      /* Genel reveal (once) */
      gsap.utils.toArray('.reveal').forEach(function (el) {
        gsap.fromTo(el, { opacity: 0, y: 48 }, {
          opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onStart: function () { el.classList.add('in'); }
        });
      });

      /* Bolum basliklari */
      gsap.utils.toArray('.index-title').forEach(function (title) {
        gsap.from(title, {
          opacity: 0, y: 30, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: title, start: 'top 85%', once: true }
        });
      });

      /* Work grid parallax (derinlik belirgin: -24 / -88) */
      gsap.utils.toArray('.work-item').forEach(function (item, i) {
        var frame = item.querySelector('.frame');
        if (!frame) return;
        var depth = (i % 2 === 0) ? -24 : -88;
        gsap.fromTo(frame, { yPercent: 0 }, {
          yPercent: depth, ease: 'none',
          scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Process gorselleri parallax + hafif zoom (scale 1.08) */
      gsap.utils.toArray('.step-visual img').forEach(function (img) {
        gsap.fromTo(img, { yPercent: -8, scale: 1.02 }, {
          yPercent: 8, scale: 1.08, ease: 'none',
          scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Genel medya parallax (sayfa ici tek gorseller) */
      gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        gsap.fromTo(el, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Sayac / istatistik animasyonu */
      gsap.utils.toArray('.count').forEach(function (el) {
        var to = parseInt(el.getAttribute('data-to'), 10) || 0;
        var obj = { val: 0 };
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function () {
            gsap.to(obj, { val: to, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(obj.val); } });
          }
        });
      });

      /* Marquee scroll-velocity ile dramatiklesir */
      var track = document.querySelector('.marquee-track');
      if (track) {
        ScrollTrigger.create({
          trigger: '.marquee', start: 'top bottom', end: 'bottom top',
          onUpdate: function (self) {
            var v = self.getVelocity();
            track.style.animationDuration = (42 / (1 + Math.min(Math.abs(v) / 2500, 1.4))) + 's';
          }
        });
      }
    }

    initScrollChrome();
    initCursor();
    initLightbox();
    runEntrance();
  }

  /* =================================================================
     BOOTSTRAP
     ================================================================= */
  function boot() {
    initLang();
    initNav();
    initPageTransitions();
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
