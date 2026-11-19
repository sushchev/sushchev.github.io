(() => {
  'use strict';
  const root = document.documentElement;
  const prefersQuiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let quiet = prefersQuiet.matches;
  try { quiet = quiet || localStorage.getItem('iscrop-motion') === 'quiet'; } catch (_) {}
  root.classList.add('js');
  const motionButtons = [...document.querySelectorAll('.motion-toggle')];
  function setQuiet(value, persist = false) {
    quiet = value || prefersQuiet.matches;
    root.dataset.motion = quiet ? 'quiet' : 'full';
    motionButtons.forEach(button => button.setAttribute('aria-pressed', String(quiet)));
    if (persist) { try { localStorage.setItem('iscrop-motion', quiet ? 'quiet' : 'full'); } catch (_) {} }
    updateScroll();
  }
  motionButtons.forEach(button => button.addEventListener('click', () => setQuiet(!quiet, true)));

  const menu = document.getElementById('site-menu');
  const viewer = document.getElementById('image-viewer');
  const imageCursor = document.querySelector('.image-cursor');
  function openDialog(dialog) {
    imageCursor.classList.remove('visible');
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  document.querySelector('.menu-button').addEventListener('click', () => openDialog(menu));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    });
  });
  menu.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => menu.close()));

  const tabs = [...document.querySelectorAll('.direction-tabs [role="tab"]')];
  function activateTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(next, true); }
    });
  });

  const art = [
    { src: 'assets/hero-optical-v2.webp', title: 'Свет в материале', alt: 'Художественная композиция из оптического стекла и тёплого проходящего света', description: 'Форма меняет путь света. Свет раскрывает форму.' },
    { src: 'assets/optical-study-v2.webp', title: 'Структура и преломление', alt: 'Макроэтюд ребристого стекла с золотыми каустиками и сливовыми отражениями', description: 'Знакомая физика в неожиданном масштабе.' },
    { src: 'assets/signal-study-v2.svg', title: 'Геометрия сигнала', alt: 'Абстрактные золотые и сливовые волновые поля', description: 'Ритм, наложение и связь между частями целого.' }
  ];
  let viewerIndex = 0;
  function showArt(index) {
    viewerIndex = (index + art.length) % art.length;
    const selected = art[viewerIndex];
    const image = document.getElementById('viewer-image');
    image.src = selected.src;
    image.alt = selected.alt;
    document.getElementById('viewer-title').textContent = selected.title;
    document.getElementById('viewer-description').textContent = selected.description;
    document.getElementById('viewer-count').textContent = `${viewerIndex + 1} / ${art.length}`;
  }
  let suppressZoomUntil = 0;
  document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', event => {
    if (performance.now() < suppressZoomUntil) { event.preventDefault(); return; }
    showArt(Number(button.dataset.zoom));
    openDialog(viewer);
  }));
  document.getElementById('viewer-prev').addEventListener('click', () => showArt(viewerIndex - 1));
  document.getElementById('viewer-next').addEventListener('click', () => showArt(viewerIndex + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showArt(viewerIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  const track = document.querySelector('.gallery-track');
  const slides = [...track.querySelectorAll('.gallery-slide')];
  const previous = document.getElementById('gallery-prev');
  const next = document.getElementById('gallery-next');
  let galleryIndex = 0;
  function slidePosition(index) {
    return slides[index].offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft);
  }
  function updateGallery() {
    let distance = Infinity;
    slides.forEach((slide, i) => {
      const delta = Math.abs(slidePosition(i) - track.scrollLeft);
      if (delta < distance) { distance = delta; galleryIndex = i; }
    });
    document.getElementById('gallery-count').textContent = `${galleryIndex + 1} / ${slides.length}`;
    previous.disabled = galleryIndex === 0;
    next.disabled = galleryIndex === slides.length - 1;
  }
  function goToSlide(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({ left: slidePosition(index), behavior: quiet ? 'auto' : 'smooth' });
  }
  previous.addEventListener('click', () => goToSlide(galleryIndex - 1));
  next.addEventListener('click', () => goToSlide(galleryIndex + 1));
  track.addEventListener('scroll', updateGallery, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); goToSlide(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let drag = null;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, start: event.clientX, scroll: track.scrollLeft, active: false };
  });
  track.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.start;
    if (Math.abs(delta) > 7 && !drag.active) {
      drag.active = true; track.setPointerCapture(event.pointerId); track.classList.add('dragging');
    }
    if (drag.active) { event.preventDefault(); track.scrollLeft = drag.scroll - delta; }
  });
  function endDrag() {
    if (!drag) return;
    if (drag.active) {
      suppressZoomUntil = performance.now() + 250;
      if (track.hasPointerCapture(drag.id)) track.releasePointerCapture(drag.id);
    }
    drag = null; track.classList.remove('dragging');
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', event => event.preventDefault());
  updateGallery();

  const manifesto = document.querySelector('[data-word-reveal]');
  const words = manifesto.textContent.trim().split(/\s+/);
  manifesto.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span'); span.className = 'manifesto-word'; span.textContent = word;
    manifesto.append(span);
    if (i < words.length - 1) manifesto.append(document.createTextNode(' '));
  });
  const wordElements = [...manifesto.querySelectorAll('span')];
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.reading-progress span');
  const banner = document.querySelector('[data-scroll-image]');
  let scrollQueued = false;
  function clamp(value) { return Math.min(1, Math.max(0, value)); }
  function updateScroll() {
    const scroll = window.scrollY;
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${clamp(scroll / total)})`;
    header.classList.toggle('scrolled', scroll > 28);
    if (quiet) wordElements.forEach(word => { word.style.opacity = '1'; });
    else {
      const bounds = manifesto.getBoundingClientRect();
      const fraction = clamp((window.innerHeight * .88 - bounds.top) / (window.innerHeight * .62 + bounds.height * .3));
      wordElements.forEach((word, index) => { word.style.opacity = String(.24 + .76 * clamp(fraction * (words.length + 3) - index)); });
    }
    if (banner) {
      const bounds = banner.parentElement.getBoundingClientRect();
      const shift = quiet ? 0 : Math.max(-24, Math.min(24, (window.innerHeight / 2 - bounds.top - bounds.height / 2) * .06));
      banner.style.setProperty('--scroll-y', shift + 'px');
    }
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  window.addEventListener('resize', () => { updateScroll(); updateGallery(); });
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveals.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(element => reveals.observe(element));
  } else document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
  const hero = document.querySelector('.hero');
  const heroImage = document.querySelector('.hero-image');
  hero.addEventListener('pointermove', event => {
    if (quiet || !finePointer.matches || event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    heroImage.style.setProperty('--px', ((event.clientX - rect.left) / rect.width - .5) * 12 + 'px');
    heroImage.style.setProperty('--py', ((event.clientY - rect.top) / rect.height - .5) * 9 + 'px');
  });
  hero.addEventListener('pointerleave', () => { heroImage.style.setProperty('--px', '0px'); heroImage.style.setProperty('--py', '0px'); });
  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', event => {
      if (quiet || !finePointer.matches || event.pointerType !== 'mouse') return;
      const rect = element.getBoundingClientRect();
      element.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .045}px,${(event.clientY - rect.top - rect.height / 2) * .09}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || quiet || document.querySelector('dialog[open]')) { imageCursor.classList.remove('visible'); return; }
    const target = event.target.closest?.('[data-zoom]');
    imageCursor.classList.toggle('visible', Boolean(target));
    if (target) imageCursor.style.transform = `translate(${event.clientX - 42}px,${event.clientY - 42}px)`;
  });
  document.addEventListener('pointerleave', () => imageCursor.classList.remove('visible'));
  prefersQuiet.addEventListener?.('change', () => setQuiet(prefersQuiet.matches));
  setQuiet(quiet);

  const canvas = document.getElementById('wave-canvas');
  const context = canvas.getContext('2d');
  const phaseControl = document.getElementById('phase-control');
  function drawWaves() {
    if (!context) return;
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    if (width < 1 || height < 1) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const left = 29, right = width - 9, middle = height * .48, amplitude = height * .18;
    context.lineWidth = .6; context.strokeStyle = '#6575913b';
    for (let i = -2; i <= 2; i++) {
      const y = middle - i * amplitude;
      context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = left + (right - left) * i / 8;
      context.beginPath(); context.moveTo(x, middle - amplitude * 2.3); context.lineTo(x, middle + amplitude * 2.3); context.stroke();
    }
    context.fillStyle = '#9ca9bf'; context.font = '12px Manrope, sans-serif'; context.textAlign = 'right';
    for (const n of [-2, 0, 2]) context.fillText(String(n).replace('-', '−'), left - 9, middle - n * amplitude + 4);
    const degrees = Number(phaseControl.value), phase = degrees * Math.PI / 180;
    const paths = [
      { colour: '#fca41d', thickness: 1.3, value: t => Math.sin(t) },
      { colour: '#c17b9f', thickness: 1.3, value: t => Math.sin(t + phase) },
      { colour: '#f1f3f8', thickness: 2.1, value: t => Math.sin(t) + Math.sin(t + phase) }
    ];
    paths.forEach(path => {
      context.beginPath(); context.strokeStyle = path.colour; context.lineWidth = path.thickness;
      for (let x = left; x <= right; x += 1) {
        const t = (x - left) / (right - left) * Math.PI * 6;
        const y = middle - path.value(t) * amplitude;
        if (x === left) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    });
    const sum = 2 * Math.abs(Math.cos(phase / 2));
    const label = sum < .03 ? 'В этой модели волны полностью гасят друг друга.' : sum > 1.98 ? 'Волны усиливают друг друга.' : sum < 1 ? 'Сумма ослабляется.' : 'Волны складываются с фазовым сдвигом.';
    document.getElementById('phase-value').textContent = degrees + '°';
    document.getElementById('wave-state').textContent = `${label} Амплитуда суммы: ${sum.toFixed(2).replace('.', ',')}.`;
    canvas.setAttribute('aria-label', `Фаза ${degrees} градусов. Амплитуда суммы ${sum.toFixed(2)} условных единиц.`);
    document.querySelectorAll('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === degrees)));
  }
  phaseControl.addEventListener('input', drawWaves);
  document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => { phaseControl.value = button.dataset.phase; drawWaves(); }));
  if ('ResizeObserver' in window) new ResizeObserver(drawWaves).observe(canvas.parentElement);
  else window.addEventListener('resize', drawWaves);
  document.fonts?.ready.then(drawWaves);
  drawWaves();

  const copyButton = document.getElementById('copy-email');
  let copyTimeout;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('info@iscrop.ru');
      document.getElementById('copy-label').textContent = 'Скопировано';
      document.querySelector('.copy-status').textContent = 'Адрес info@iscrop.ru скопирован.';
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => { document.getElementById('copy-label').textContent = 'Скопировать'; }, 2200);
    } catch (_) { document.querySelector('.copy-status').textContent = 'Адрес для письма: info@iscrop.ru'; }
  });
})();
