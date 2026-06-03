/* ============================================================
   WoLo Riso Zine - paylasilan JS (tum sayfalar)
   Lenis + GSAP + ScrollTrigger senkron, custom cursor, reveal,
   counters, marquee, lightbox, initNav, setLang (i18n), sayfa gecisleri.
   FAIL-SAFE: GSAP/Lenis yoksa reveal opacity:1, counters son deger,
   anchor native scroll.

   YUKLEME SIRASI (kritik): bu dosya DEFER ile body sonunda.
   GSAP/ScrollTrigger/Lenis CDN head'de DEFER. defer'li scriptler
   dokuman sirasinda calisir -> gsap, scrolltrigger, lenis, riso.js.
   ============================================================ */

(function () {
  'use strict';

  // GSAP / Lenis var mi? (fail-safe icin)
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;

  /* ---------------------------------------------------------
     1) LENIS + GSAP + SCROLLTRIGGER SENKRON
     --------------------------------------------------------- */
  function initSmoothScroll() {
    if (hasGSAP && hasST) {
      gsap.registerPlugin(ScrollTrigger);
    }
    // reduced-motion'da Lenis kurma, native scroll kalsin
    if (hasLenis && !prefersReduced) {
      lenis = new Lenis({
        duration: 1.1,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      if (hasST) {
        // Lenis scroll -> ScrollTrigger guncelle
        lenis.on('scroll', ScrollTrigger.update);
        // GSAP ticker Lenis raf'i surer, lag smoothing kapali
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
      }
    }
  }

  // Lenis-aware programatik scroll
  function scrollToTarget(target, opts) {
    if (lenis) { lenis.scrollTo(target, opts || {}); }
    else if (typeof target === 'number') { window.scrollTo({ top: target, behavior: prefersReduced ? 'auto' : 'smooth' }); }
    else if (target && target.scrollIntoView) { target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' }); }
  }

  /* ---------------------------------------------------------
     2) CUSTOM CURSOR
     --------------------------------------------------------- */
  function initCursor() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot); document.body.appendChild(ring);

    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    // Ring biraz gecikmeli (yumusak takip)
    function ringRaf() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(ringRaf);
    }
    requestAnimationFrame(ringRaf);

    // Interaktif elemanlarda buyu
    var hot = 'a, button, .polaroid, .chap, .client, [data-lightbox]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hot)) document.body.classList.add('cursor-hot');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hot)) document.body.classList.remove('cursor-hot');
    });
  }

  /* ---------------------------------------------------------
     3) REVEAL (bir kez; reduced-motion'da aninda gorunur)
     --------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    // FAIL-SAFE veya reduced-motion: hemen goster
    if (prefersReduced) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          var delay = prefersReduced ? 0 : i * 80;
          setTimeout(function () { e.target.classList.add('in'); }, delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     4) COUNTERS (count-up; fail-safe son deger)
     --------------------------------------------------------- */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function setFinal(el) {
      el.textContent = el.getAttribute('data-count');
    }

    // GSAP/ST yoksa veya reduced-motion: son deger
    if (!hasGSAP || !hasST || prefersReduced) {
      nums.forEach(setFinal);
      return;
    }

    nums.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2.2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v); },
        onComplete: function () { setFinal(el); }
      });
    });
  }

  /* ---------------------------------------------------------
     5) MARQUEE (CSS animasyonlu; hover pause CSS'te.
        Burada sadece reduced-motion icin durdurma garantisi)
     --------------------------------------------------------- */
  function initMarquee() {
    if (!prefersReduced) return;
    document.querySelectorAll('.marquee-track').forEach(function (t) {
      t.style.animation = 'none';
    });
  }

  /* ---------------------------------------------------------
     6) HERO PARALLAX + TAPE DRIFT (GSAP ScrollTrigger)
     --------------------------------------------------------- */
  function initHeroParallax() {
    if (!hasGSAP || !hasST || prefersReduced) return;

    var heroImg = document.querySelector('.hero-image');
    if (heroImg) {
      gsap.to(heroImg, {
        yPercent: -15, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    document.querySelectorAll('.hero .tape').forEach(function (tp, i) {
      gsap.to(tp, {
        yPercent: 8, rotation: (i % 2 === 0 ? 1.5 : -1.5), ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------
     7) SCROLL PROGRESS + BACK TO TOP
     --------------------------------------------------------- */
  function initScrollUI() {
    var progress = document.querySelector('.scroll-progress');
    var backTop = document.querySelector('.back-top');

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY || window.pageYOffset;
      if (progress) progress.style.width = ((y / Math.max(max, 1)) * 100) + '%';
      if (backTop) backTop.classList.toggle('visible', y > 600);
    }
    // Lenis varsa onun scroll event'i, yoksa window scroll
    if (lenis) lenis.on('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    update();

    if (backTop) {
      backTop.addEventListener('click', function () { scrollToTarget(0); });
    }
  }

  /* ---------------------------------------------------------
     8) ANCHOR (ic linkler) - Lenis-aware, fail-safe native
     --------------------------------------------------------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (t) { e.preventDefault(); scrollToTarget(t, { offset: -90 }); }
      });
    });
  }

  /* ---------------------------------------------------------
     9) INIT NAV (.active + aria-current, hamburger drawer)
     --------------------------------------------------------- */
  function initNav() {
    // Aktif sayfa: pathname'den dosya adi
    var path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === '') path = 'index.html';

    document.querySelectorAll('.nav-links a, .nav-drawer a[data-page]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop();
      if (href === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    // Hamburger drawer toggle
    var burger = document.querySelector('.nav-burger');
    var drawer = document.querySelector('.nav-drawer');
    var overlay = document.querySelector('.drawer-overlay');
    if (!burger || !drawer) return;

    function openDrawer() {
      burger.classList.add('open');
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      burger.classList.remove('open');
      drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', function () {
      if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
    });
    if (overlay) overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  }

  /* ---------------------------------------------------------
     10) LIGHTBOX (focus-trap, inert, Esc, simetrik kapanis)
     --------------------------------------------------------- */
  var lb = { el: null, inner: null, lastFocus: null, img: null, title: null, meta: null, desc: null };

  function buildLightbox() {
    if (document.querySelector('.lightbox')) { cacheLightbox(); return; }
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Project detail');
    box.innerHTML =
      '<button class="lightbox-close" aria-label="Close">&#215;</button>' +
      '<div class="lightbox-inner">' +
        '<div class="lb-img"></div>' +
        '<h3></h3>' +
        '<div class="lb-meta"></div>' +
        '<p class="lb-desc"></p>' +
      '</div>';
    document.body.appendChild(box);
    cacheLightbox();
  }

  function cacheLightbox() {
    lb.el = document.querySelector('.lightbox');
    lb.inner = lb.el.querySelector('.lightbox-inner');
    lb.img = lb.el.querySelector('.lb-img');
    lb.title = lb.el.querySelector('h3');
    lb.meta = lb.el.querySelector('.lb-meta');
    lb.desc = lb.el.querySelector('.lb-desc');
  }

  function getLang() { return document.documentElement.lang === 'tr' ? 'tr' : 'en'; }

  function openLightbox(trigger) {
    if (!lb.el) buildLightbox();
    lb.lastFocus = document.activeElement;
    var lang = getLang();
    var img = trigger.getAttribute('data-lb-img') || '';
    var title = trigger.getAttribute('data-lb-title') || '';
    var meta = trigger.getAttribute('data-lb-meta') || '';
    var desc = lang === 'tr'
      ? (trigger.getAttribute('data-lb-desc-tr') || trigger.getAttribute('data-lb-desc-en') || '')
      : (trigger.getAttribute('data-lb-desc-en') || '');

    lb.img.style.backgroundImage = img ? "url('" + img + "')" : 'none';
    lb.title.textContent = title;
    lb.meta.textContent = meta;
    lb.desc.textContent = desc;

    lb.el.classList.add('open');
    // inert: arka plani erisimsiz yap
    document.querySelectorAll('body > *:not(.lightbox)').forEach(function (n) {
      if (n.setAttribute) n.setAttribute('inert', '');
    });
    document.body.style.overflow = 'hidden';
    var closeBtn = lb.el.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lb.el) return;
    lb.el.classList.remove('open');
    document.querySelectorAll('body > *[inert]').forEach(function (n) {
      n.removeAttribute('inert');
    });
    document.body.style.overflow = '';
    if (lb.lastFocus && lb.lastFocus.focus) lb.lastFocus.focus();
  }

  function initLightbox() {
    var triggers = document.querySelectorAll('[data-lightbox]');
    if (!triggers.length) return;
    buildLightbox();

    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(t);
      });
      // klavye: Enter/Space
      t.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(t); }
      });
    });

    lb.el.addEventListener('click', function (e) {
      if (e.target === lb.el || e.target.classList.contains('lightbox-close')) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.el || !lb.el.classList.contains('open')) return;
      if (e.key === 'Escape') { closeLightbox(); return; }
      if (e.key === 'Tab') {
        // basit focus-trap (sadece kapatma butonu odaklanabilir)
        var focusables = lb.el.querySelectorAll('button, a[href]');
        if (focusables.length) {
          var first = focusables[0], last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    // global erisim (HTML onclick fallback)
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
  }

  /* ---------------------------------------------------------
     11) i18n - setLang (data-en/data-tr, localStorage, toggle)
        Varsayilan EN. innerHTML uygular.
     --------------------------------------------------------- */
  function setLang(lang) {
    if (lang !== 'tr') lang = 'en';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-en]').forEach(function (el) {
      var val = lang === 'tr' ? (el.getAttribute('data-tr') || el.getAttribute('data-en')) : el.getAttribute('data-en');
      if (val != null) el.innerHTML = val;
    });

    // Form placeholder'lari (data-ph-en / data-ph-tr)
    document.querySelectorAll('[data-ph-en]').forEach(function (el) {
      var val = lang === 'tr' ? (el.getAttribute('data-ph-tr') || el.getAttribute('data-ph-en')) : el.getAttribute('data-ph-en');
      if (val != null) el.setAttribute('placeholder', val);
    });

    // Toggle aktif durum
    document.querySelectorAll('.lang-toggle button, .drawer-lang button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-l') === lang);
    });

    try { localStorage.setItem('wolo-lang', lang); } catch (e) {}

    // ScrollTrigger varsa layout degisiminden sonra tazele
    if (hasST) { try { ScrollTrigger.refresh(); } catch (e) {} }
  }

  function initLang() {
    document.querySelectorAll('.lang-toggle button, .drawer-lang button').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-l')); });
    });
    var saved = 'en';
    try { saved = localStorage.getItem('wolo-lang') || 'en'; } catch (e) {}
    setLang(saved);
    window.setLang = setLang;
  }

  /* ---------------------------------------------------------
     12) SAYFA GECISLERI (overlay sweep ~0.5s sonra navigate)
        reduced-motion'da aninda gec.
     --------------------------------------------------------- */
  function buildTransition() {
    var pt = document.querySelector('.page-transition');
    if (!pt) {
      pt = document.createElement('div');
      pt.className = 'page-transition';
      pt.setAttribute('aria-hidden', 'true');
      pt.innerHTML = '<span class="pt-mark">WoLo</span>';
      document.body.appendChild(pt);
    }
    return pt;
  }

  function isInternalPage(href) {
    if (!href) return false;
    if (href.indexOf('#') === 0) return false;
    if (href.indexOf('http') === 0) return false;
    if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return false;
    // ../../ galeriye don gibi disari giden linkleri de gecisle yapma (basit kalsin)
    return /\.html(\?.*)?$/.test(href) && href.indexOf('../') !== 0;
  }

  function initPageTransitions() {
    // Giris animasyonu
    document.body.classList.add('page-enter');

    if (prefersReduced) return; // sweep yok, native gecis

    var pt = buildTransition();

    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!isInternalPage(href)) return;
      if (a.target === '_blank') return;

      a.addEventListener('click', function (e) {
        // modifikasyonlu tiklamalari birak (yeni sekme vb.)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        pt.classList.remove('sweep-out');
        pt.classList.add('sweep-in');
        setTimeout(function () { window.location.href = href; }, 500);
      });
    });

    // bfcache geri donus: overlay'i temizle
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) { pt.classList.remove('sweep-in'); pt.classList.remove('sweep-out'); }
    });
  }

  /* ---------------------------------------------------------
     13) GENERIC SCROLL REVEAL via GSAP (stagger), opsiyonel
        .reveal'lar IO ile zaten gorunuyor; GSAP varsa daha akici
        timeline veriyoruz (gruplu .reveal-stagger).
     --------------------------------------------------------- */
  function initGsapStagger() {
    if (!hasGSAP || !hasST || prefersReduced) return;
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var kids = group.querySelectorAll('.stagger-item');
      if (!kids.length) return;
      gsap.from(kids, {
        opacity: 0, y: 40, duration: 0.8, ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 80%', once: true }
      });
    });
  }

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  function boot() {
    initSmoothScroll();
    initCursor();
    initNav();
    initLang();
    initReveal();
    initCounters();
    initMarquee();
    initHeroParallax();
    initGsapStagger();
    initScrollUI();
    initAnchors();
    initLightbox();
    initPageTransitions();

    // Tum kurulumdan sonra ScrollTrigger tazele
    if (hasST) { try { ScrollTrigger.refresh(); } catch (e) {} }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
