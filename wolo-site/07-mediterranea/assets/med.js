/* ============================================================
   WoLo Mediterranea · paylasilan motion + i18n + nav + transitions
   GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.20 (CDN, head'de yuklenir)
   Rotus plani: birlesik easing, Lenis/GSAP timing hizalama,
   Ken Burns scrub durdurma, derinlik merdiveni, page-transition,
   hamburger drawer, focus-trap lightbox, fail-safe.
   Tum cevrilebilir metin: data-en / data-tr (innerHTML), varsayilan EN.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var doc = document.documentElement;

  /* ---------- i18n: data-en / data-tr ---------- */
  // Her cevrilebilir elemanin EN (varsayilan) ve TR icerigi attribute'larda durur.
  // setLang innerHTML uygular, localStorage'a kaydeder. Varsayilan EN.
  var i18nEls = [].slice.call(document.querySelectorAll('[data-en]'));
  var phEls = [].slice.call(document.querySelectorAll('[data-ph-en]')); // placeholder cevirisi

  window.setLang = function (lang) {
    if (lang !== 'tr') lang = 'en';
    doc.lang = lang;
    i18nEls.forEach(function (el) {
      var val = (lang === 'tr') ? el.getAttribute('data-tr') : el.getAttribute('data-en');
      if (val != null) el.innerHTML = val;
    });
    phEls.forEach(function (el) {
      var p = (lang === 'tr') ? el.getAttribute('data-ph-tr') : el.getAttribute('data-ph-en');
      if (p != null) el.setAttribute('placeholder', p);
    });
    document.querySelectorAll('.lang-toggle button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.l === lang);
    });
    try { localStorage.setItem('wolo-lang', lang); } catch (e) {}
    // dil degisince hero kelimelerini yeniden bol (markup korunur)
    if (heroSplitDone) splitHeroWords(true);
  };

  function initLang() {
    var saved = 'en';
    try { saved = localStorage.getItem('wolo-lang') || 'en'; } catch (e) {}
    window.setLang(saved);
  }

  /* ---------- initNav: pathname -> .active + aria-current ---------- */
  function initNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    if (path === '') path = 'index.html';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var target = a.getAttribute('data-nav');
      if (target === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
  }

  /* ---------- HAMBURGER DRAWER ---------- */
  function initDrawer() {
    var burger = document.querySelector('.nav-burger');
    var drawer = document.querySelector('.drawer');
    if (!burger || !drawer) return;
    var lastFocus = null;

    function openDrawer() {
      lastFocus = document.activeElement;
      document.body.classList.add('drawer-open');
      drawer.classList.add('open');
      drawer.removeAttribute('inert');
      burger.setAttribute('aria-expanded', 'true');
      if (window.lenisRef) window.lenisRef.stop();
      var first = drawer.querySelector('a');
      if (first) first.focus();
      document.addEventListener('keydown', onKey);
    }
    function closeDrawer() {
      document.body.classList.remove('drawer-open');
      drawer.classList.remove('open');
      drawer.setAttribute('inert', '');
      burger.setAttribute('aria-expanded', 'false');
      if (window.lenisRef) window.lenisRef.start();
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { closeDrawer(); }
      // basit focus trap
      if (e.key === 'Tab') {
        var f = drawer.querySelectorAll('a, button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    burger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('inert', '');
    burger.addEventListener('click', function () {
      if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
    });
    // backdrop tap: drawer'in bos alanina (link/buton degil) tiklayinca kapansin
    drawer.addEventListener('click', function (e) {
      if (e.target === drawer) closeDrawer();
    });
    // drawer ic linkleri (page-transition zaten navigate eder, panel kapansin)
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { closeDrawer(); });
    });
  }

  /* ---------- PAGE TRANSITIONS ---------- */
  // ic .html linkte: kobalt panel asagidan yukari sweep (~0.5s) sonra navigate.
  // yeni sayfada: panel ustten gelir, kalkar (entrance). reduced-motion: aninda gec.
  function initPageTransitions() {
    var overlay = document.querySelector('.page-trans');
    if (!overlay) return;

    // entrance: yeni sayfa yuklendiginde paneli kaldir
    if (!prefersReduced) {
      overlay.classList.add('enter');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add('lift');
          setTimeout(function () { overlay.classList.remove('enter', 'lift'); }, 700);
        });
      });
    }

    if (prefersReduced) return; // exit animasyonu yok, native navigate

    function isInternal(href) {
      if (!href) return false;
      if (href.charAt(0) === '#') return false;
      if (/^(mailto:|tel:|https?:|\/\/)/i.test(href)) return false;
      return /\.html(\?|#|$)/.test(href) || href === '' ;
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!isInternal(href)) return;
      // ayni sayfaya ise birak
      var dest = href.split('#')[0].split('?')[0];
      var cur = location.pathname.split('/').pop();
      if (dest === cur) return;
      e.preventDefault();
      overlay.classList.remove('enter', 'lift');
      overlay.classList.add('exit');
      setTimeout(function () { window.location.href = href; }, 500);
    });

    // geri/ileri ile gelince panel takili kalmasin
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) { overlay.classList.remove('exit', 'enter', 'lift'); }
    });
  }

  /* ---------- Hero word-split ---------- */
  var heroSplitDone = false;
  function splitHeroWords(rebuild) {
    var h1 = document.querySelector('[data-split="words"]');
    if (!h1) return;
    if (rebuild) {
      // mevcut maskeleri soyup guncel metni tekrar bol
      var clean = h1.innerHTML.replace(/<span class="word"><span>([\s\S]*?)<\/span><\/span>/g, '$1');
      h1.innerHTML = clean;
    }
    var html = h1.innerHTML;
    var parts = html.split(/(\s+)/);
    var out = parts.map(function (tok) {
      if (/^\s+$/.test(tok) || tok === '') return tok;
      return '<span class="word"><span>' + tok + '</span></span>';
    }).join('');
    h1.innerHTML = out;
    heroSplitDone = true;
  }

  /* ---------- Counter ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (prefersReduced || !hasGSAP) { el.textContent = target + suffix; return; }
    // rotus: duration sayiya orantili (Math.sqrt(target)*0.4, alt sinir 0.6)
    var dur = Math.max(0.6, Math.sqrt(target) * 0.4);
    var obj = { v: 0 };
    window.gsap.to(obj, {
      v: target, duration: dur, ease: 'none',
      onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; },
      onComplete: function () { el.textContent = target + suffix; }
    });
  }

  /* ---------- LIGHTBOX (focus-trap + Esc + simetrik) ---------- */
  function initLightbox() {
    var lb = document.querySelector('.lightbox');
    if (!lb) return;
    var media = lb.querySelector('.lightbox-media');
    var titleEl = lb.querySelector('.lightbox-cap h4');
    var metaEl = lb.querySelector('.lightbox-cap .lb-meta');
    var closeBtn = lb.querySelector('.lightbox-close');
    var lastFocus = null;
    var siblingMains = [].slice.call(document.querySelectorAll('main, nav, footer, .topbar'));

    window.openLightbox = function (trigger) {
      lastFocus = trigger || document.activeElement;
      var img = trigger ? trigger.getAttribute('data-lb-img') : '';
      var t = trigger ? trigger.getAttribute('data-lb-title') : '';
      var m = trigger ? trigger.getAttribute('data-lb-meta') : '';
      if (media) media.style.backgroundImage = img ? "url('" + img + "')" : '';
      if (titleEl) titleEl.innerHTML = t || '';
      if (metaEl) metaEl.textContent = m || '';
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      siblingMains.forEach(function (el) { el.setAttribute('inert', ''); });
      if (window.lenisRef) window.lenisRef.stop();
      if (closeBtn) closeBtn.focus();
      document.addEventListener('keydown', onKey);
    };
    window.closeLightbox = function () {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      siblingMains.forEach(function (el) { el.removeAttribute('inert'); });
      if (window.lenisRef) window.lenisRef.start();
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    };
    function onKey(e) {
      if (e.key === 'Escape') window.closeLightbox();
      if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button, a, [tabindex]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (closeBtn) closeBtn.addEventListener('click', window.closeLightbox);
    lb.addEventListener('click', function (e) { if (e.target === lb) window.closeLightbox(); });

    // data-lightbox tetikleyicileri
    document.querySelectorAll('[data-lightbox]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        window.openLightbox(el);
      });
    });
  }

  /* ---------- Scroll progress + back-to-top ---------- */
  function initProgressAndTop() {
    var progress = document.querySelector('.scroll-progress');
    var toTop = document.querySelector('.to-top');
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = (window.scrollY / Math.max(max, 1)) * 100;
      if (progress) progress.style.width = pct + '%';
      if (toTop) toTop.classList.toggle('show', window.scrollY > window.innerHeight * 0.7);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (toTop) {
      toTop.addEventListener('click', function () {
        if (window.lenisRef) window.lenisRef.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (prefersReduced) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;
    var rx = 0, ry = 0, dx = 0, dy = 0;
    document.addEventListener('mousemove', function (e) {
      dx = e.clientX; dy = e.clientY;
      dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
    }, { passive: true });
    function raf() {
      rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(raf);
    }
    raf();
    var hoverSel = 'a, button, .work-item, .svc, .showreel, [data-lightbox]';
    document.querySelectorAll(hoverSel).forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('hover'); });
    });
  }

  /* ---------- FAIL-SAFE: GSAP yoksa ---------- */
  if (!hasGSAP) {
    doc.classList.add('no-anim');
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = (parseFloat(el.getAttribute('data-count')) || 0) + (el.getAttribute('data-suffix') || '');
    });
    // anchor native scroll
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' }); }
      });
    });
    boot();
    return;
  }

  // GSAP var: reveal'lari GSAP yonetecek (CLS'siz baslangic)
  doc.classList.add('has-anim');

  /* ---------- REDUCED MOTION (GSAP var ama hareket kapali) ---------- */
  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = (parseFloat(el.getAttribute('data-count')) || 0) + (el.getAttribute('data-suffix') || '');
    });
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'auto' }); }
      });
    });
    boot();
    return; // Lenis + scroll animasyonlarini atla
  }

  /* ---------- GSAP + ScrollTrigger + Lenis init & senkron ---------- */
  window.gsap.registerPlugin(window.ScrollTrigger);

  var lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({
      duration: 1.15,   // rotus: GSAP reveal (1.1-1.2s) ile hizali
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    window.lenisRef = lenis;
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    window.gsap.ticker.lagSmoothing(0);
  }

  var EASE = 'power3.out'; // birlesik reveal easing

  // hero kelimelerini bol (varsa)
  splitHeroWords(false);

  // Hero intro timeline (sadece bu sayfada hero varsa)
  var hasHero = document.querySelector('.hero');
  if (hasHero) {
    var heroTl = window.gsap.timeline({ defaults: { ease: EASE } });
    heroTl
      .from('.hero-eyebrow', { y: 24, opacity: 0, duration: 0.7 }, 0.1)
      .from('.hero h1 .word > span', { yPercent: 110, duration: 1, stagger: 0.06 }, 0.2)
      .from('.hero-blurb', { y: 26, opacity: 0, duration: 0.8 }, 0.55)
      .from('.hero-cta-row > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, 0.7)
      .from('.hero-scroll', { opacity: 0, duration: 0.6 }, 0.9);

    // rotus #2: hero-media saf parallax %12, scrub sirasinda Ken Burns dur
    var heroMedia = document.querySelector('.hero-media');
    window.gsap.to('.hero-media', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: function (self) {
          if (heroMedia) heroMedia.classList.toggle('scrubbing', self.progress > 0.001 && self.progress < 0.999);
        }
      }
    });
  }

  // Page-head dekoratif parallax (ic sayfa hero'su)
  document.querySelectorAll('.page-head').forEach(function (ph) {
    window.gsap.fromTo(ph.querySelector('h1'), { y: 0 }, {
      y: -20, ease: 'none',
      scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true }
    });
  });

  // rotus #10: section reveal'leri hero'dan sonra; tekil reveal'ler
  document.querySelectorAll('.reveal').forEach(function (el) {
    // grid cocuklari ayri stagger ile yonetilecek; onlari atla
    if (el.closest('.svc-grid, .proc-grid, .clients-grid, .work-grid, .value-grid')) return;
    window.gsap.fromTo(el,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1.1, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: function () { el.classList.add('in'); }
      }
    );
  });

  // grup stagger (orantili: services/clients/value 0.12, process 0.15)
  [['.svc-grid', 0.12], ['.proc-grid', 0.15], ['.clients-grid', 0.12], ['.work-grid', 0.12], ['.value-grid', 0.12]]
    .forEach(function (pair) {
      var group = document.querySelector(pair[0]);
      if (!group) return;
      var kids = group.querySelectorAll('.reveal');
      if (!kids.length) return;
      window.gsap.fromTo(kids,
        { y: 44, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.95, ease: EASE, stagger: pair[1],
          scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          onStart: function () { kids.forEach(function (k) { k.classList.add('in'); }); }
        }
      );
    });

  // rotus #2: derinlik merdiveni - work-item parallax %16
  document.querySelectorAll('.work-item .frame-inner').forEach(function (inner) {
    window.gsap.fromTo(inner,
      { yPercent: -8 },
      {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: inner.closest('.work-item'), start: 'top bottom', end: 'bottom top', scrub: true }
      }
    );
  });

  // showreel parallax %10
  var reel = document.querySelector('.showreel .reel-media');
  if (reel) {
    window.gsap.fromTo(reel, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: '.showreel', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // split medya hafif parallax
  document.querySelectorAll('.split-media .split-inner').forEach(function (inner) {
    window.gsap.fromTo(inner, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: inner.closest('.split-media'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // counters
  document.querySelectorAll('[data-count]').forEach(function (el) {
    window.ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () { runCounter(el); }
    });
  });

  // hash linkleri Lenis ile yumusak kaydir
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var t = document.getElementById(id);
      if (t) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -60 });
        else t.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });

  boot();

  /* ---------- ortak boot (her kosulda) ---------- */
  function boot() {
    initLang();
    initNav();
    initDrawer();
    initPageTransitions();
    initLightbox();
    initProgressAndTop();
    initCursor();
  }
})();
