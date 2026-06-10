/* ─────────────────────────────────────────────────────────
   1. NAVBAR
───────────────────────────────────────────────────────── */
(function initNavbar() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', function () {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
})();


/* ─────────────────────────────────────────────────────────
   2. GALLERY
───────────────────────────────────────────────────────── */
(function initGallery() {

  /* ── Referencias DOM ── */
  var grid         = document.getElementById('galleryGrid');
  var filtersDiv   = document.getElementById('galleryFilters');
  var addBtn       = document.getElementById('addPhotoBtn');
  var formWrap     = document.getElementById('photoFormWrapper');
  var cancelBtn    = document.getElementById('cancelPhoto');
  var photoForm    = document.getElementById('photoForm');
  var fileInput    = document.getElementById('photoFile');
  var urlInput     = document.getElementById('photoUrl');
  var submitBtn    = document.getElementById('photoSubmitBtn');
  var formTitleEl  = document.getElementById('photoFormTitle');
  var progressWrap = document.getElementById('uploadProgress');
  var progressBar  = document.getElementById('uploadBar');
  var progressText = document.getElementById('uploadText');
  var errorBox     = document.getElementById('photoError');
  var lightbox     = document.getElementById('lightbox');
  var lbImg        = document.getElementById('lightboxImg');
  var lbCaption    = document.getElementById('lightboxCaption');
  var lbClose      = document.getElementById('lightboxClose');

  if (!grid || !addBtn) return;

  var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var currentFilter = 'all';
  var allPhotos = [];

  /* ── Error helpers ── */
  function showError(msg) {
    errorBox.textContent = '⚠️ ' + msg;
    errorBox.hidden = false;
  }
  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  /* ── Filtros ── */
  function rebuildFilters() {
    var months = allPhotos
      .map(function (p) { return p.dateFilter; })
      .filter(Boolean)
      .filter(function (v, i, a) { return a.indexOf(v) === i; })
      .sort();

    filtersDiv.innerHTML = '';

    addFilterBtn('all', 'Todos');
    months.forEach(function (m) {
      var parts = m.split('-');
      addFilterBtn(m, MESES[parseInt(parts[1], 10) - 1] + ' ' + parts[0]);
    });
  }

  function addFilterBtn(filter, label) {
    var btn = document.createElement('button');
    btn.className = 'gallery__filter-btn' + (currentFilter === filter ? ' gallery__filter-btn--active' : '');
    btn.textContent = filter === currentFilter ? label : label;
    btn.dataset.filter = filter;
    btn.addEventListener('click', function () {
      currentFilter = filter;
      filtersDiv.querySelectorAll('.gallery__filter-btn').forEach(function (b) {
        b.classList.toggle('gallery__filter-btn--active', b === btn);
      });
      renderGrid();
    });
    filtersDiv.appendChild(btn);
  }

  /* ── Render grid ── */
  function renderGrid() {
    grid.innerHTML = '';
    var list = currentFilter === 'all'
      ? allPhotos
      : allPhotos.filter(function (p) { return p.dateFilter === currentFilter; });
    list.forEach(addPhotoCard);
  }

  function addPhotoCard(photo) {
    var fig = document.createElement('figure');
    fig.className = 'gallery__item';
    fig.dataset.date = photo.dateFilter;
    fig.dataset.id = photo.id;
    fig.innerHTML =
      '<div class="gallery__item-actions">' +
        '<button class="gallery__item-btn gallery__item-btn--edit" title="Editar">✏️</button>' +
        '<button class="gallery__item-btn gallery__item-btn--delete" title="Eliminar">🗑️</button>' +
      '</div>' +
      '<img src="' + escapeAttr(photo.src) + '" alt="' + escapeAttr(photo.captionTitle || '') + '" class="gallery__img" loading="lazy" />' +
      '<figcaption class="gallery__caption">' +
        '<span class="gallery__caption-title">' + escapeHtml(photo.captionTitle || '') + '</span>' +
        '<span class="gallery__caption-date">' + escapeHtml(photo.captionDate || '') + '</span>' +
      '</figcaption>';

    fig.querySelector('.gallery__img').addEventListener('click', function (e) {
      e.stopPropagation();
      openLightbox(photo.src, photo.captionTitle || '');
    });
    fig.querySelector('.gallery__item-btn--edit').addEventListener('click', function (e) {
      e.stopPropagation();
      openEditForm(photo);
    });
    fig.querySelector('.gallery__item-btn--delete').addEventListener('click', function (e) {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta foto?')) return;
      db.collection('photos').doc(photo.id).delete();
    });

    grid.appendChild(fig);
  }

  /* ── Firestore tiempo real ── */
  db.collection('photos').orderBy('createdAt', 'asc').onSnapshot(function (snap) {
    allPhotos = snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });
    rebuildFilters();
    renderGrid();
  }, function (err) {
    console.error('Firestore error:', err);
  });

  /* ── Abrir / cerrar formulario ── */
  addBtn.addEventListener('click', function () {
    photoForm.reset();
    photoForm.dataset.editId = '';
    photoForm.dataset.editSrc = '';
    formTitleEl.textContent = 'Agregar foto';
    urlInput.value = '';
    progressWrap.hidden = true;
    clearError();
    addBtn.hidden = true;
    formWrap.hidden = false;
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  cancelBtn.addEventListener('click', closeForm);

  function closeForm() {
    formWrap.hidden = true;
    addBtn.hidden = false;
    photoForm.reset();
    photoForm.dataset.editId = '';
    photoForm.dataset.editSrc = '';
    progressWrap.hidden = true;
    clearError();
  }

  function openEditForm(photo) {
    photoForm.dataset.editId = photo.id;
    photoForm.dataset.editSrc = photo.src;
    formTitleEl.textContent = 'Editar foto';
    document.getElementById('photoTitle').value = photo.captionTitle || '';
    document.getElementById('photoDate').value = photo.dateFilter || '';
    urlInput.value = photo.src || '';
    progressWrap.hidden = true;
    clearError();
    addBtn.hidden = true;
    formWrap.hidden = false;
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── Submit ── */
  photoForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var title   = document.getElementById('photoTitle').value.trim();
    var dateVal = document.getElementById('photoDate').value;
    var editId  = photoForm.dataset.editId;
    var editSrc = photoForm.dataset.editSrc;

    if (!title)   { showError('Agrega un título para la foto.'); return; }
    if (!dateVal) { showError('Selecciona el mes y año.');       return; }

    var parts = dateVal.split('-');
    var captionDate = MESES[parseInt(parts[1], 10) - 1] + ' ' + parts[0];

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    var urlValue = urlInput.value.trim();
    var file = fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (file) {
      if (!file.type.startsWith('image/')) {
        showError('El archivo no es una imagen. Usa JPG, PNG o WEBP.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar foto';
        return;
      }

      progressWrap.hidden = false;
      progressBar.style.width = '50%';
      progressText.textContent = 'Comprimiendo imagen...';

      compressImage(file)
        .then(function (dataUrl) {
          progressBar.style.width = '100%';
          progressText.textContent = '¡Listo!';
          guardarFoto(dataUrl, title, captionDate, dateVal, editId, editSrc);
        })
        .catch(function (err) {
          progressWrap.hidden = true;
          showError(err.message || 'Error al procesar la imagen.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar foto';
        });

    } else if (urlValue) {
      guardarFoto(urlValue, title, captionDate, dateVal, editId, editSrc);

    } else {
      showError('Sube una foto o pega una URL de imagen.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar foto';
    }
  });

  function guardarFoto(src, title, captionDate, dateVal, editId, editSrc) {
    var data = {
      src: src,
      alt: title,
      captionTitle: title,
      captionDate: captionDate,
      dateFilter: dateVal
    };

    var promise = editId
      ? db.collection('photos').doc(editId).update(data)
      : db.collection('photos').add(Object.assign({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, data));

    promise
      .then(function () { closeForm(); })
      .catch(function (err) {
        console.error('Firestore error:', err);
        showError('Error al guardar en base de datos: ' + err.message);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar foto';
      });
  }

  /* ── Lightbox ── */
  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption;
    lbCaption.textContent = caption;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });

})();


/* ─────────────────────────────────────────────────────────
   3. LETTERS — Firestore + tiempo real
───────────────────────────────────────────────────────── */
(function initLetters() {
  var openBtn     = document.getElementById('openLetterForm');
  var cancelBtn   = document.getElementById('cancelLetter');
  var formWrapper = document.getElementById('letterFormWrapper');
  var form        = document.getElementById('letterForm');
  var grid        = document.getElementById('lettersGrid');
  var textarea    = document.getElementById('letterContent');
  var charCount   = document.getElementById('charCount');

  if (!openBtn || !form || !grid) return;

  textarea.addEventListener('input', function () {
    charCount.textContent = textarea.value.length;
  });

  openBtn.addEventListener('click', function () {
    form.dataset.editId = '';
    formWrapper.hidden = false;
    openBtn.hidden = true;
    form.elements['title'].focus();
  });

  cancelBtn.addEventListener('click', resetForm);

  function resetForm() {
    form.reset();
    form.dataset.editId = '';
    charCount.textContent = '0';
    clearErrors();
    formWrapper.hidden = true;
    openBtn.hidden = false;
  }

  function clearErrors() {
    form.querySelectorAll('.form__error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('.form__input').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showError(inputId, msg) {
    var input = document.getElementById(inputId);
    var error = input && input.parentElement.querySelector('.form__error');
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = msg;
  }

  function validateForm(data) {
    var valid = true;
    clearErrors();
    if (!data.title.trim())   { showError('letterTitle',   'El título es obligatorio.'); valid = false; }
    if (!data.type)            { showError('letterType',    'Elige un tipo de mensaje.'); valid = false; }
    if (!data.content.trim()) { showError('letterContent', 'El contenido no puede estar vacío.'); valid = false; }
    return valid;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      title:   form.elements['title'].value,
      type:    form.elements['type'].value,
      content: form.elements['content'].value
    };
    if (!validateForm(data)) return;

    var editId  = form.dataset.editId;
    var btn     = form.querySelector('[type="submit"]');
    btn.disabled = true;

    var promise = editId
      ? db.collection('letters').doc(editId).update(data)
      : db.collection('letters').add(Object.assign({ date: firebase.firestore.FieldValue.serverTimestamp() }, data));

    promise
      .then(function () { resetForm(); })
      .catch(function (err) { alert('Error al guardar: ' + err.message); })
      .finally(function () { btn.disabled = false; });
  });

  db.collection('letters').orderBy('date', 'desc').onSnapshot(function (snap) {
    grid.querySelectorAll('.letter-card--dynamic').forEach(function (c) { c.remove(); });
    snap.docs.forEach(function (d) { renderCard(Object.assign({ id: d.id }, d.data())); });
  });

  var tagClassMap = {
    carta: '', mensaje: 'letter-card__tag--mensaje',
    poema: 'letter-card__tag--poema', promesa: 'letter-card__tag--promesa'
  };

  function renderCard(letter) {
    var card = document.createElement('article');
    card.className = 'letter-card letter-card--dynamic' + (letter.fulfilled ? ' letter-card--fulfilled' : '');
    card.dataset.id = letter.id;

    var tagClass  = tagClassMap[letter.type] || '';
    var dateLabel = letter.date && letter.date.toDate
      ? letter.date.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    var fulfillHtml = letter.type === 'promesa'
      ? '<button class="letter-card__fulfill' + (letter.fulfilled ? ' letter-card__fulfill--done' : '') + '">' +
          (letter.fulfilled ? '✓ Cumplida' : '○ Marcar como cumplida') + '</button>'
      : '';

    card.innerHTML =
      '<div class="letter-card__actions">' +
        '<button class="letter-card__edit" title="Editar">✏️</button>' +
        '<button class="letter-card__delete" title="Eliminar">✕</button>' +
      '</div>' +
      '<header class="letter-card__header">' +
        '<span class="letter-card__tag ' + tagClass + '">' + capitalize(letter.type) + '</span>' +
        '<time class="letter-card__date">' + dateLabel + '</time>' +
      '</header>' +
      '<h3 class="letter-card__title">' + escapeHtml(letter.title) + '</h3>' +
      '<p class="letter-card__preview">' + escapeHtml(letter.content) + '</p>' +
      '<button class="letter-card__read-btn" aria-expanded="false">Leer completo</button>' +
      '<div class="letter-card__full" hidden>' +
        escapeHtml(letter.content).split('\n').map(function (p) { return p ? '<p>' + p + '</p>' : ''; }).join('') +
      '</div>' +
      fulfillHtml;

    card.querySelector('.letter-card__delete').addEventListener('click', function () {
      if (!confirm('¿Eliminar este mensaje?')) return;
      db.collection('letters').doc(letter.id).delete();
    });

    card.querySelector('.letter-card__edit').addEventListener('click', function () {
      form.elements['title'].value   = letter.title;
      form.elements['type'].value    = letter.type;
      form.elements['content'].value = letter.content;
      charCount.textContent = letter.content.length;
      form.dataset.editId = letter.id;
      formWrapper.hidden = false;
      openBtn.hidden = true;
      formWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    var fulfillBtn = card.querySelector('.letter-card__fulfill');
    if (fulfillBtn) {
      fulfillBtn.addEventListener('click', function () {
        db.collection('letters').doc(letter.id).update({ fulfilled: !letter.fulfilled });
      });
    }

    wireReadMore(card);
    grid.appendChild(card);
  }
})();


/* ─────────────────────────────────────────────────────────
   4. METAS
───────────────────────────────────────────────────────── */
(function initMetas() {
  var list    = document.getElementById('metasList');
  var input   = document.getElementById('metaInput');
  var addBtn  = document.getElementById('metaAddBtn');
  var countEl = document.getElementById('metasCount');

  if (!list) return;

  function addMeta() {
    var text = input.value.trim();
    if (!text) return;
    db.collection('metas').add({
      text: text,
      completed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
    input.focus();
  }

  addBtn.addEventListener('click', addMeta);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') addMeta(); });

  db.collection('metas').orderBy('createdAt', 'asc').onSnapshot(function (snap) {
    list.innerHTML = '';
    var docs = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    var done = docs.filter(function (d) { return d.completed; }).length;
    countEl.textContent = done + ' / ' + docs.length + ' cumplidas';
    docs.forEach(renderMeta);
  });

  function renderMeta(meta) {
    var li = document.createElement('li');
    li.className = 'notepad__item' + (meta.completed ? ' notepad__item--done' : '');
    li.dataset.id = meta.id;
    li.innerHTML =
      '<input class="notepad__checkbox" type="checkbox" id="meta_' + meta.id + '" ' + (meta.completed ? 'checked' : '') + ' />' +
      '<label class="notepad__text" for="meta_' + meta.id + '">' + escapeHtml(meta.text) + '</label>' +
      '<button class="notepad__delete" title="Eliminar">✕</button>';

    li.querySelector('.notepad__checkbox').addEventListener('change', function (e) {
      db.collection('metas').doc(meta.id).update({ completed: e.target.checked });
    });
    li.querySelector('.notepad__delete').addEventListener('click', function () {
      if (!confirm('¿Eliminar esta meta?')) return;
      db.collection('metas').doc(meta.id).delete();
    });
    list.appendChild(li);
  }
})();


/* ─────────────────────────────────────────────────────────
   5. READ-MORE
───────────────────────────────────────────────────────── */
document.querySelectorAll('.letter-card:not(.letter-card--dynamic)').forEach(wireReadMore);

function wireReadMore(card) {
  var btn  = card.querySelector('.letter-card__read-btn');
  var full = card.querySelector('.letter-card__full');
  if (!btn || !full) return;
  btn.addEventListener('click', function () {
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    full.hidden = expanded;
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.textContent = expanded ? 'Leer completo' : 'Cerrar';
  });
}


/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function compressImage(file, maxWidth, quality) {
  maxWidth = maxWidth || 900;
  quality  = quality  || 0.78;

  return new Promise(function (resolve, reject) {
    var reader = new FileReader();

    reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };

    reader.onload = function (e) {
      var img = new Image();

      img.onerror = function () {
        reject(new Error('Formato no compatible. Usa JPG, PNG o WEBP.'));
      };

      img.onload = function () {
        var width  = img.width;
        var height = img.height;

        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width  = maxWidth;
        }

        var canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl && dataUrl.length > 50) resolve(dataUrl);
        else reject(new Error('No se pudo comprimir la imagen.'));
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function capitalize(str) {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}
