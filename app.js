/**
 * app.js — Lógica principal de la página
 *
 * Módulos:
 *  1. Navbar — efecto scroll
 *  2. Gallery — filtros por fecha + lightbox
 *  3. Letters — repositorio de cartas (localStorage)
 *  4. Read-more — expandir texto en tarjetas
 */

/* ─────────────────────────────────────────────────────────
   1. NAVBAR — añade clase al hacer scroll
───────────────────────────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ─────────────────────────────────────────────────────────
   2. GALLERY — filtros + lightbox
───────────────────────────────────────────────────────── */
(function initGallery() {
  const grid       = document.getElementById('galleryGrid');
  const filterBtns = document.querySelectorAll('.gallery__filter-btn');
  const lightbox   = document.getElementById('lightbox');
  const lbImg      = document.getElementById('lightboxImg');
  const lbCaption  = document.getElementById('lightboxCaption');
  const lbClose    = document.getElementById('lightboxClose');

  if (!grid) return;

  /** Filtra los ítems según el valor del botón */
  function applyFilter(filter) {
    const items = grid.querySelectorAll('.gallery__item');
    items.forEach(item => {
      const match = filter === 'all' || item.dataset.date === filter;
      item.classList.toggle('hidden', !match);
    });
  }

  /** Marca el botón activo */
  function setActiveBtn(btn) {
    filterBtns.forEach(b => b.classList.remove('gallery__filter-btn--active'));
    btn.classList.add('gallery__filter-btn--active');
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveBtn(btn);
      applyFilter(btn.dataset.filter);
    });
  });

  /* ── Lightbox ── */
  function openLightbox(imgSrc, captionText) {
    lbImg.src     = imgSrc;
    lbImg.alt     = captionText;
    lbCaption.textContent = captionText;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  grid.addEventListener('click', e => {
    const item = e.target.closest('.gallery__item');
    if (!item) return;
    const img     = item.querySelector('.gallery__img');
    const caption = item.querySelector('.gallery__caption-title')?.textContent ?? '';
    openLightbox(img.src, caption);
  });

  lbClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
})();


/* ─────────────────────────────────────────────────────────
   3. LETTERS — formulario + localStorage
───────────────────────────────────────────────────────── */
(function initLetters() {
  const STORAGE_KEY = 'love_letters_v1';

  const openBtn       = document.getElementById('openLetterForm');
  const cancelBtn     = document.getElementById('cancelLetter');
  const formWrapper   = document.getElementById('letterFormWrapper');
  const form          = document.getElementById('letterForm');
  const grid          = document.getElementById('lettersGrid');
  const textarea      = document.getElementById('letterContent');
  const charCount     = document.getElementById('charCount');

  if (!openBtn || !form || !grid) return;

  /* ── Persistencia ── */
  function loadLetters() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveLetters(letters) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
  }

  /* ── Contador de caracteres ── */
  textarea.addEventListener('input', () => {
    charCount.textContent = textarea.value.length;
  });

  /* ── Mostrar / ocultar formulario ── */
  openBtn.addEventListener('click', () => {
    formWrapper.hidden = false;
    openBtn.hidden     = true;
    form.elements['title'].focus();
  });

  cancelBtn.addEventListener('click', resetForm);

  function resetForm() {
    form.reset();
    charCount.textContent = '0';
    clearErrors();
    formWrapper.hidden = true;
    openBtn.hidden     = false;
  }

  /* ── Validación ── */
  function clearErrors() {
    form.querySelectorAll('.form__error').forEach(el => (el.textContent = ''));
    form.querySelectorAll('.form__input').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = input?.parentElement?.querySelector('.form__error');
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
  }

  function validateForm(data) {
    let valid = true;
    clearErrors();
    if (!data.title.trim()) {
      showError('letterTitle', 'El título es obligatorio.');
      valid = false;
    }
    if (!data.type) {
      showError('letterType', 'Elige un tipo de mensaje.');
      valid = false;
    }
    if (!data.content.trim()) {
      showError('letterContent', 'El contenido no puede estar vacío.');
      valid = false;
    }
    return valid;
  }

  /* ── Guardar nueva carta ── */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      id:      crypto.randomUUID(),
      title:   form.elements['title'].value,
      type:    form.elements['type'].value,
      content: form.elements['content'].value,
      date:    new Date().toISOString(),
    };

    if (!validateForm(data)) return;

    const letters = loadLetters();
    letters.unshift(data);
    saveLetters(letters);
    renderDynamicCard(data, true);
    resetForm();
  });

  /* ── Renderizar tarjeta dinámica ── */
  function renderDynamicCard(letter, prepend = false) {
    const card = document.createElement('article');
    card.className  = 'letter-card letter-card--dynamic';
    card.dataset.id = letter.id;

    const tagClass  = tagClassMap[letter.type] || '';
    const dateLabel = new Date(letter.date).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    card.innerHTML = `
      <button class="letter-card__delete" aria-label="Eliminar mensaje" title="Eliminar">✕</button>
      <header class="letter-card__header">
        <span class="letter-card__tag ${tagClass}">${capitalize(letter.type)}</span>
        <time class="letter-card__date">${dateLabel}</time>
      </header>
      <h3 class="letter-card__title">${escapeHtml(letter.title)}</h3>
      <p class="letter-card__preview">${escapeHtml(letter.content)}</p>
      <button class="letter-card__read-btn" aria-expanded="false">Leer completo</button>
      <div class="letter-card__full" hidden>
        ${escapeHtml(letter.content).split('\n').map(p => p ? `<p>${p}</p>` : '').join('')}
      </div>
    `;

    /* Eliminar */
    card.querySelector('.letter-card__delete').addEventListener('click', () => {
      if (!confirm('¿Eliminar este mensaje?')) return;
      const letters = loadLetters().filter(l => l.id !== letter.id);
      saveLetters(letters);
      card.remove();
    });

    /* Read-more inline */
    wireReadMore(card);

    if (prepend) {
      grid.insertBefore(card, grid.firstChild);
    } else {
      grid.appendChild(card);
    }
  }

  /* ── Cargar cartas guardadas al iniciar ── */
  loadLetters().forEach(letter => renderDynamicCard(letter, false));

  /* ── Mapa de clases por tipo ── */
  const tagClassMap = {
    carta:   '',
    mensaje: 'letter-card__tag--mensaje',
    poema:   'letter-card__tag--poema',
    promesa: 'letter-card__tag--promesa',
  };
})();


/* ─────────────────────────────────────────────────────────
   4. READ-MORE — expandir/colapsar texto en tarjetas fijas
───────────────────────────────────────────────────────── */
(function initReadMore() {
  document.querySelectorAll('.letter-card:not(.letter-card--dynamic)').forEach(wireReadMore);
})();

/** Conecta el botón "Leer completo" de una tarjeta */
function wireReadMore(card) {
  const btn  = card.querySelector('.letter-card__read-btn');
  const full = card.querySelector('.letter-card__full');
  if (!btn || !full) return;

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    full.hidden    = expanded;
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.textContent = expanded ? 'Leer completo' : 'Cerrar';
  });
}

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
