(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* mobile menu */
  var menuBtn = $('.menu-btn');
  var nav = $('#nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  /* reveal on scroll */
  var reveals = $$('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* the two meanings of "state" take turns */
  var senseEls = $$('[data-sense]');
  if (senseEls.length && !reduceMotion) {
    var current = 1;
    var paint = function () {
      senseEls.forEach(function (el) {
        el.classList.toggle('hl', Number(el.getAttribute('data-sense')) === current);
      });
    };
    paint();
    setInterval(function () {
      current = current === 1 ? 2 : 1;
      paint();
    }, 2600);
  }

  /* the training mock-up walks through its states */
  var mock = $('[data-mock]');
  if (mock && !reduceMotion) {
    var items = $$('.checklist li', mock);
    var phase = 2;
    var apply = function () {
      mock.setAttribute('data-phase', String(phase));
      items.forEach(function (li) {
        var done = Number(li.getAttribute('data-done')) <= phase;
        var active = !done && Number(li.getAttribute('data-active')) === phase;
        li.classList.toggle('is-done', done);
        li.classList.toggle('is-active', active);
      });
    };
    var durations = [1600, 2400, 3600];
    var tick = function () {
      setTimeout(function () {
        phase = (phase + 1) % 3;
        apply();
        tick();
      }, durations[phase]);
    };
    apply();
    tick();
  }

  /* contact: copy address */
  var copyBtn = $('#copy-mail');
  if (copyBtn) {
    var status = $('#copy-status');
    var original = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      var done = function () {
        copyBtn.textContent = copyBtn.getAttribute('data-copied');
        if (status) status.textContent = copyBtn.getAttribute('data-copied');
        setTimeout(function () { copyBtn.textContent = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { window.location.href = 'mailto:' + email; });
      } else {
        var input = document.createElement('input');
        input.value = email;
        document.body.appendChild(input);
        input.select();
        try { document.execCommand('copy'); done(); } catch (e) { window.location.href = 'mailto:' + email; }
        document.body.removeChild(input);
      }
    });
  }

  /* contact: build a mailto: message, nothing is sent or stored by this site */
  var form = $('#contact-form');
  if (form) {
    var topic = new URLSearchParams(window.location.search).get('topic');
    var isSecurity = topic === 'security';
    var banner = $('#topic-banner');
    if (isSecurity) {
      if (banner) banner.hidden = false;
      var msg = form.elements.message;
      if (msg && !msg.value) msg.value = form.getAttribute('data-message-security');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = form.elements;
      var subject = form.getAttribute(isSecurity ? 'data-subject-security' : 'data-subject-default');
      var org = data.org.value.trim();
      if (!isSecurity && org) subject += ': ' + org;
      var lines = [form.getAttribute('data-greeting'), ''];
      if (data.message.value.trim()) lines.push(data.message.value.trim(), '');
      if (data.process.value.trim()) lines.push(form.getAttribute('data-label-process') + ': ' + data.process.value.trim());
      if (org) lines.push(form.getAttribute('data-label-org') + ': ' + org);
      if (data.name.value.trim()) lines.push('', data.name.value.trim());
      var href = 'mailto:' + form.getAttribute('data-email') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\r\n'));
      window.location.href = href;
    });
  }
})();
