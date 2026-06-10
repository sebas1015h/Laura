/* ─────────────────────────────────────────────────────────
   1. NAVBAR
───────────────────────────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ─────────────────────────────────────────────────────────
   2. GALLERY — Firestore + Storage + tiempo real
───────────────────────────────────────────────────────── */
(function initGallery() {
  const grid         = document.getElementById('galleryGrid');
  const filtersDiv   = document.getElementById('galleryFilters');
  const lightbox     = document.getElementById('lightbox');
  const lbImg        = document.getElementById('lightboxImg');
  const lbCaption    = document.getElementById('lightboxCaption');
  const lbClose      = document.getElementById('lightboxClose');
  const addBtn       = document.getElementById('addPhotoBtn');
  const formWrap     = document.getElementById('photoFormWrapper');
  const photoForm    = document.getElementById('photoForm');
  const cancelBtn    = document.getElementById('cancelPhoto');
  const fileInput    = document.getElementById('photoFile');
  const urlInput     = document.getElementById('photoUrl');
  const progressWrap = document.getElementById('uploadProgress');
  const progressBar  = document.getElementById('uploadBar');
  const progressText = document.getElementById('uploadText');
  const submitBtn    = document.getElementById('photoSubmitBtn');
  const formTitleEl  = document.getElementById('photoFormTitle');

  if (!grid) return;

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  let currentFilter = 'all';
  let allPhotos     = [];

  function labelFromFilter(dateFilter) {
    const [y, m] = dateFilter.split('-');
    return `${MESES[parseInt(m, 10) - 1]} ${y}`;
  }

  /* ── Regenera botones de filtro según meses en Firestore ── */
  function updateFilters() {
    const months = [...new Set(allPhotos.map(p => p.dateFilter).filter(Boolean))].sort();
    filtersDiv.innerHTML = '';

    const allBtnEl = document.createElement('button');
    allBtnEl.className = 'gallery__filter-btn' + (currentFilter === 'all' ? ' gallery__filter-btn--active' : '');
    allBtnEl.dataset.filter = 'all';
    allBtnEl.textContent = 'Todos';
    allBtnEl.addEventListener('click', () => applyFilter('all', allBtnEl));
    filtersDiv.appendChild(allBtnEl);

    months.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'gallery__filter-btn' + (currentFilter === m ? ' gallery__filter-btn--active' : '');
      btn.dataset.filter = m;
      btn.textContent = labelFromFilter(m);
      btn.addEventListener('click', () => applyFilter(m, btn));
      filtersDiv.appendChild(btn);
    });
  }

  function applyFilter(filter, clickedBtn) {
    currentFilter = filter;
    filtersDiv.querySelectorAll('.gallery__filter-btn').forEach(b =>
      b.classList.toggle('gallery__filter-btn--active', b === clickedBtn)
    );
    renderPhotos();
  }

  /* ── Renderiza las fotos filtradas ── */
  function renderPhotos() {
    grid.innerHTML = '';
    const list = currentFilter === 'all'
      ? allPhotos
      : allPhotos.filter(p => p.dateFilter === currentFilter);
    list.forEach(createPhotoEl);
  }

  function createPhotoEl(photo) {
    const fig = document.createElement('figure');
    fig.className    = 'gallery__item';
    fig.dataset.date = photo.dateFilter;
    fig.dataset.id   = photo.id;

    fig.innerHTML = `
      <div class="gallery__item-actions">
        <button class="gallery__item-btn gallery__item-btn--edit"   aria-label="Editar"   title="Editar">✏️</button>
        <button class="gallery__item-btn gallery__item-btn--delete" aria-label="Eliminar" title="Eliminar">🗑️</button>
      </div>
      <img src="${escapeAttr(photo.src)}" alt="${escapeAttr(photo.captionTitle || '')}"
           class="gallery__img" loading="lazy" />
      <figcaption class="gallery__caption">
        <span class="gallery__caption-title">${escapeHtml(photo.captionTitle || '')}</span>
        <span class="gallery__caption-date">${escapeHtml(photo.captionDate  || '')}</span>
      </figcaption>
    `;

    fig.querySelector('.gallery__img').addEventListener('click', e => {
      e.stopPropagation();
      openLightbox(photo.src, photo.captionTitle || '');
    });

    fig.querySelector('.gallery__item-btn--edit').addEventListener('click', e => {
      e.stopPropagation();
      openEditForm(photo);
    });

    fig.querySelector('.gallery__item-btn--delete').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta foto?')) return;
      db.collection('photos').doc(photo.id).delete();
    });

    grid.appendChild(fig);
  }

  /* ── Firestore: escucha cambios en tiempo real ── */
  db.collection('photos')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateFilters();
      renderPhotos();
    });

  /* ── Abrir / cerrar formulario ── */
  addBtn.addEventListener('click', () => {
    photoForm.reset();
    photoForm.dataset.editId  = '';
    photoForm.dataset.editSrc = '';
    formTitleEl.textContent   = 'Agregar foto';
    urlInput.value            = '';
    progressWrap.hidden       = true;
    formWrap.hidden           = false;
    addBtn.hidden             = true;
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  cancelBtn.addEventListener('click', closeForm);

  function closeForm() {
    formWrap.hidden = true;
    addBtn.hidden   = false;
    photoForm.reset();
    photoForm.dataset.editId  = '';
    photoForm.dataset.editSrc = '';
    progressWrap.hidden = true;
  }

  function openEditForm(photo) {
    photoForm.dataset.editId  = photo.id;
    photoForm.dataset.editSrc = photo.src;
    formTitleEl.textContent   = 'Editar foto';
    document.getElementById('photoTitle').value = photo.captionTitle || '';
    document.getElementById('photoDate').value  = photo.dateFilter   || '';
    urlInput.value      = photo.src || '';
    progressWrap.hidden = true;
    formWrap.hidden     = false;
    addBtn.hidden       = true;
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ── Submit: subir a Storage o guardar URL ── */
  photoForm.addEventListener('submit', async e => {
    e.preventDefault();

    const title   = document.getElementById('photoTitle').value.trim();
    const dateVal = document.getElementById('photoDate').value;
    const editId  = photoForm.dataset.editId;
    const editSrc = photoForm.dataset.editSrc;

    if (!title)   { alert('Agrega un título para la foto.'); return; }
    if (!dateVal) { alert('Selecciona el mes y año.');       return; }

    const [year, month] = dateVal.split('-');
    const captionDate   = `${MESES[parseInt(month, 10) - 1]} ${year}`;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Guardando...';

    try {
      let src = urlInput.value.trim() || editSrc;

      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const ref  = storage.ref(`photos/${Date.now()}.jpg`);

        progressWrap.hidden      = false;
        progressBar.style.width  = '0%';
        progressText.textContent = 'Comprimiendo imagen...';

        const compressed = await compressImage(file);

        progressText.textContent = 'Subiendo...';

        await new Promise((resolve, reject) => {
          const task = ref.put(compressed, { contentType: 'image/jpeg' });
          task.on('state_changed',
            snap => {
              const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
              progressBar.style.width  = pct + '%';
              progressText.textContent = `Subiendo... ${pct}%`;
            },
            reject,
            resolve
          );
        });

        src = await ref.getDownloadURL();
        progressText.textContent = '¡Listo!';
      }

      if (!src) { alert('Sube una foto o pega una URL de imagen.'); return; }

      const data = {
        src,
        alt:          title,
        captionTitle: title,
        captionDate,
        dateFilter:   dateVal,
      };

      if (editId) {
        await db.collection('photos').doc(editId).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('photos').add(data);
      }

      closeForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la foto. Revisa la consola.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Guardar foto';
    }
  });

  /* ── Lightbox ── */
  function openLightbox(src, caption) {
    lbImg.src             = src;
    lbImg.alt             = caption;
    lbCaption.textContent = caption;
    lightbox.hidden       = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
})();


/* ─────────────────────────────────────────────────────────
   3. LETTERS — Firestore + tiempo real
───────────────────────────────────────────────────────── */
(function initLetters() {
  const openBtn     = document.getElementById('openLetterForm');
  const cancelBtn   = document.getElementById('cancelLetter');
  const formWrapper = document.getElementById('letterFormWrapper');
  const form        = document.getElementById('letterForm');
  const grid        = document.getElementById('lettersGrid');
  const textarea    = document.getElementById('letterContent');
  const charCount   = document.getElementById('charCount');

  if (!openBtn || !form || !grid) return;

  textarea.addEventListener('input', () => {
    charCount.textContent = textarea.value.length;
  });

  openBtn.addEventListener('click', () => {
    form.dataset.editId = '';
    formWrapper.hidden  = false;
    openBtn.hidden      = true;
    form.elements['title'].focus();
  });

  cancelBtn.addEventListener('click', resetForm);

  function resetForm() {
    form.reset();
    form.dataset.editId   = '';
    charCount.textContent = '0';
    clearErrors();
    formWrapper.hidden = true;
    openBtn.hidden     = false;
  }

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
    if (!data.title.trim())   { showError('letterTitle',   'El título es obligatorio.'); valid = false; }
    if (!data.type)            { showError('letterType',    'Elige un tipo de mensaje.'); valid = false; }
    if (!data.content.trim()) { showError('letterContent', 'El contenido no puede estar vacío.'); valid = false; }
    return valid;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title:   form.elements['title'].value,
      type:    form.elements['type'].value,
      content: form.elements['content'].value,
    };

    if (!validateForm(data)) return;

    const editId    = form.dataset.editId;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (editId) {
        await db.collection('letters').doc(editId).update(data);
      } else {
        data.date = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('letters').add(data);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el mensaje.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* ── Firestore: escucha cambios en tiempo real ── */
  db.collection('letters')
    .orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      grid.querySelectorAll('.letter-card--dynamic').forEach(c => c.remove());
      snapshot.docs.forEach(doc => renderCard({ id: doc.id, ...doc.data() }));
    });

  const tagClassMap = {
    carta:   '',
    mensaje: 'letter-card__tag--mensaje',
    poema:   'letter-card__tag--poema',
    promesa: 'letter-card__tag--promesa',
  };

  function renderCard(letter) {
    const card      = document.createElement('article');
    card.className  = 'letter-card letter-card--dynamic' + (letter.fulfilled ? ' letter-card--fulfilled' : '');
    card.dataset.id = letter.id;

    const tagClass  = tagClassMap[letter.type] || '';
    const dateLabel = letter.date?.toDate
      ? letter.date.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const fulfillHtml = letter.type === 'promesa' ? `
      <button class="letter-card__fulfill ${letter.fulfilled ? 'letter-card__fulfill--done' : ''}"
              aria-label="${letter.fulfilled ? 'Quitar cumplida' : 'Marcar como cumplida'}">
        ${letter.fulfilled ? '✓ Cumplida' : '○ Marcar como cumplida'}
      </button>` : '';

    card.innerHTML = `
      <div class="letter-card__actions">
        <button class="letter-card__edit"   aria-label="Editar"   title="Editar">✏️</button>
        <button class="letter-card__delete" aria-label="Eliminar" title="Eliminar">✕</button>
      </div>
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
      ${fulfillHtml}
    `;

    card.querySelector('.letter-card__delete').addEventListener('click', () => {
      if (!confirm('¿Eliminar este mensaje?')) return;
      db.collection('letters').doc(letter.id).delete();
    });

    card.querySelector('.letter-card__edit').addEventListener('click', () => {
      form.elements['title'].value   = letter.title;
      form.elements['type'].value    = letter.type;
      form.elements['content'].value = letter.content;
      charCount.textContent          = letter.content.length;
      form.dataset.editId            = letter.id;
      formWrapper.hidden = false;
      openBtn.hidden     = true;
      form.elements['title'].focus();
      formWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const fulfillBtn = card.querySelector('.letter-card__fulfill');
    if (fulfillBtn) {
      fulfillBtn.addEventListener('click', () => {
        db.collection('letters').doc(letter.id).update({ fulfilled: !letter.fulfilled });
      });
    }

    wireReadMore(card);
    grid.appendChild(card);
  }
})();


/* ─────────────────────────────────────────────────────────
   4. METAS — bloc de notas + Firestore + tiempo real
───────────────────────────────────────────────────────── */
(function initMetas() {
  const list    = document.getElementById('metasList');
  const input   = document.getElementById('metaInput');
  const addBtn  = document.getElementById('metaAddBtn');
  const countEl = document.getElementById('metasCount');

  if (!list || !db) return;

  function addMeta() {
    const text = input.value.trim();
    if (!text) return;
    db.collection('metas').add({
      text,
      completed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    input.value = '';
    input.focus();
  }

  addBtn.addEventListener('click', addMeta);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addMeta(); });

  db.collection('metas')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      list.innerHTML = '';
      const docs  = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const total = docs.length;
      const done  = docs.filter(d => d.completed).length;
      countEl.textContent = `${done} / ${total} cumplidas`;
      docs.forEach(renderMeta);
    });

  function renderMeta(meta) {
    const li = document.createElement('li');
    li.className  = 'notepad__item' + (meta.completed ? ' notepad__item--done' : '');
    li.dataset.id = meta.id;

    li.innerHTML = `
      <input class="notepad__checkbox" type="checkbox" id="meta_${meta.id}"
             ${meta.completed ? 'checked' : ''} aria-label="Marcar como cumplida" />
      <label class="notepad__text" for="meta_${meta.id}">${escapeHtml(meta.text)}</label>
      <button class="notepad__delete" aria-label="Eliminar" title="Eliminar">✕</button>
    `;

    li.querySelector('.notepad__checkbox').addEventListener('change', e => {
      db.collection('metas').doc(meta.id).update({ completed: e.target.checked });
    });

    li.querySelector('.notepad__delete').addEventListener('click', () => {
      if (!confirm('¿Eliminar esta meta?')) return;
      db.collection('metas').doc(meta.id).delete();
    });

    list.appendChild(li);
  }
})();


/* ─────────────────────────────────────────────────────────
   5. READ-MORE — cartas fijas del HTML
───────────────────────────────────────────────────────── */
(function initReadMore() {
  document.querySelectorAll('.letter-card:not(.letter-card--dynamic)').forEach(wireReadMore);
})();

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
function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise(resolve => {
    const reader  = new FileReader();
    reader.onload = e => {
      const img    = new Image();
      img.onload   = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width  = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function capitalize(str) {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}
