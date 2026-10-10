(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Настройки из config.js ---------- */

  const S = Object.assign({ brand: '', city: '', phone: '', whatsapp: '', instagram: '' }, window.SITE || {});
  const waNumber = String(S.whatsapp).replace(/\D/g, '');
  const igHandle = String(S.instagram).replace(/^.*instagram\.com\//i, '').replace(/[@/?#].*$/, '').trim() || String(S.instagram).replace(/^@/, '').trim();

  if (S.brand) $$('[data-brand]').forEach(el => { el.textContent = S.brand; });
  if (S.city) $$('[data-city]').forEach(el => { el.textContent = S.city; });

  const contacts = {
    phone: S.phone && { text: S.phone, href: 'tel:' + String(S.phone).replace(/[^\d+]/g, '') },
    whatsapp: waNumber && { href: 'https://wa.me/' + waNumber },
    instagram: igHandle && { text: '@' + igHandle, href: 'https://instagram.com/' + igHandle },
    city: S.city && { text: S.city },
  };

  $$('[data-contact]').forEach(el => {
    const c = contacts[el.dataset.contact];
    if (!c) { (el.closest('[data-contact-row]') || el).hidden = true; return; }
    if (c.text && !el.hasAttribute('data-keep-text')) el.textContent = c.text;
    if (c.href) el.setAttribute('href', c.href);
  });

  const hasQuickContact = Boolean(contacts.phone || contacts.whatsapp);
  $('#mobileCta').hidden = !hasQuickContact;
  document.body.classList.toggle('has-mobile-cta', hasQuickContact);

  const draftBar = $('#draftBar');
  draftBar.hidden = hasQuickContact;
  $('button', draftBar).addEventListener('click', () => { draftBar.hidden = true; });

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Шапка и мобильное меню ---------- */

  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navToggle = $('#navToggle');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  navToggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Карусель на первом экране ---------- */

  const slider = $('#heroSlider');
  const slides = $$('.slide', slider);
  const dotsWrap = $('.slider-dots', slider);
  let current = 0;
  let timer = null;

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Показать фото ${i + 1}`);
    b.addEventListener('click', () => { goTo(i); restart(); });
    dotsWrap.append(b);
    return b;
  });

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === current));
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === current);
      d.toggleAttribute('aria-current', k === current);
    });
  }
  function start() { if (!reduceMotion && !timer) timer = setInterval(() => goTo(current + 1), 5500); }
  function stop() { clearInterval(timer); timer = null; }
  function restart() { stop(); start(); }

  goTo(0);
  start();
  slider.addEventListener('pointerenter', stop);
  slider.addEventListener('pointerleave', start);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* ---------- Появление блоков при прокрутке ---------- */

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Галерея: фильтры ---------- */

  const gallery = $('#gallery');
  const works = $$('.work', gallery);
  const chips = $$('.chip');

  chips.forEach(chip => {
    chip.setAttribute('aria-pressed', String(chip.classList.contains('is-active')));
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach(c => {
        c.classList.toggle('is-active', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      works.forEach(li => {
        const show = f === 'all' || li.dataset.tags.split(' ').includes(f);
        li.hidden = !show;
        if (!show) return;
        li.classList.remove('pop');
        void li.offsetWidth;
        li.classList.add('pop');
      });
    });
  });

  /* ---------- Галерея: просмотр фото ---------- */

  const lb = $('#lightbox');
  const lbImg = $('.lb-img', lb);
  const lbTitle = $('.lb-caption b', lb);
  const lbSub = $('.lb-caption span', lb);
  const lbCount = $('.lb-count', lb);
  let list = [];
  let idx = 0;

  function showPhoto(i) {
    idx = (i + list.length) % list.length;
    const li = list[idx];
    const img = $('img', li);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbTitle.textContent = $('h3', li).textContent;
    lbSub.textContent = $('p', li).textContent;
    lbCount.textContent = `${idx + 1} / ${list.length}`;
    new Image().src = $('img', list[(idx + 1) % list.length]).src;
  }

  works.forEach(li => {
    $('.work-btn', li).addEventListener('click', () => {
      list = works.filter(w => !w.hidden);
      showPhoto(list.indexOf(li));
      lb.showModal();
      document.body.classList.add('lb-open');
    });
  });

  lb.addEventListener('close', () => document.body.classList.remove('lb-open'));
  $('.lb-close', lb).addEventListener('click', () => lb.close());
  $('.lb-prev', lb).addEventListener('click', () => showPhoto(idx - 1));
  $('.lb-next', lb).addEventListener('click', () => showPhoto(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') showPhoto(idx - 1);
    if (e.key === 'ArrowRight') showPhoto(idx + 1);
  });

  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) showPhoto(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- Форма заявки → WhatsApp ---------- */

  const form = $('#leadForm');
  const layoutField = $('#layoutField');
  const formMsg = $('#formMsg');
  const nameInput = $('[name="name"]', form);
  const phoneInput = $('[name="phone"]', form);

  const syncLayout = () => { layoutField.hidden = new FormData(form).get('type') !== 'Кухня'; };
  form.addEventListener('change', syncLayout);
  syncLayout();

  // Клик по карточке услуги сразу выбирает нужный тип в форме
  $$('[data-pick]').forEach(card => card.addEventListener('click', () => {
    const radio = $(`input[name="type"][value="${card.dataset.pick}"]`, form);
    if (radio) { radio.checked = true; syncLayout(); }
  }));

  const say = (text, ok = false) => {
    formMsg.textContent = text;
    formMsg.className = ok ? 'form-ok' : 'form-error';
    formMsg.hidden = !text;
  };

  [nameInput, phoneInput].forEach(el => el.addEventListener('input', () => {
    el.classList.remove('invalid');
    say('');
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').trim();

    const badName = name.length < 2;
    const badPhone = phone.replace(/\D/g, '').length < 7;
    nameInput.classList.toggle('invalid', badName);
    phoneInput.classList.toggle('invalid', badPhone);
    if (badName || badPhone) {
      say(badName ? 'Подскажите, как к вам обращаться.' : 'Проверьте номер телефона — кажется, не хватает цифр.');
      (badName ? nameInput : phoneInput).focus();
      return;
    }

    if (!waNumber) {
      say(S.phone
        ? `Не удалось открыть WhatsApp. Позвоните нам: ${S.phone}`
        : 'Форма ещё не подключена: впишите номер WhatsApp в файле config.js.');
      return;
    }

    const type = fd.get('type');
    const lines = ['Здравствуйте! Хочу заказать мебель.', `Что нужно: ${type}`];
    if (type === 'Кухня') lines.push(`Планировка: ${fd.get('layout')}`);
    lines.push(`Имя: ${name}`, `Телефон: ${phone}`);
    const comment = String(fd.get('comment') || '').trim();
    if (comment) lines.push(`Комментарий: ${comment}`);
    lines.push('', '(заявка с сайта)');

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
    if (!window.open(url, '_blank', 'noopener')) location.href = url;
    say('Открываем WhatsApp — останется нажать «Отправить».', true);
  });
})();
