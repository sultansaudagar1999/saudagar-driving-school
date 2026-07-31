/* ---------- auth guard ---------- */
(async function guard() {
  try {
    const res = await fetch('/api/admin/ping');
    if (!res.ok) window.location.href = 'login.html';
  } catch (err) {
    window.location.href = 'login.html';
  }
})();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' }).catch(() => {});
  window.location.href = 'login.html';
});

/* ---------- tab switching ---------- */
document.getElementById('sidebar').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-panel]');
  if (!btn) return;
  document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
});

/* ---------- helpers ---------- */

function showMessage(name, text, isError) {
  const el = document.getElementById(name + '-message');
  el.textContent = text;
  el.classList.remove('success', 'error');
  el.classList.add('visible', isError ? 'error' : 'success');
  setTimeout(() => el.classList.remove('visible'), 4000);
}

async function loadJSON(name) {
  const res = await fetch(`/data/${name}.json?_=${Date.now()}`);
  return res.json();
}

async function saveJSON(name, data) {
  const res = await fetch(`/api/admin/save/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Save failed');
  return body;
}

/**
 * Renders a repeatable list of objects as editable card rows.
 * fields: [{ key, label, type: 'text'|'textarea'|'number'|'checkbox'|'select', options? }]
 * `items` is mutated in place; text/number/checkbox edits write straight into it.
 * Structural changes (add/remove) call `rerender`.
 */
function renderListEditor(container, items, fields, rerender, opts) {
  opts = opts || {};
  container.innerHTML = '';
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'card-row';

    const top = document.createElement('div');
    top.className = 'row-top';
    const label = document.createElement('span');
    label.className = 'row-index';
    label.textContent = (opts.itemLabel || 'Item') + ' ' + (index + 1);
    top.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger-ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      items.splice(index, 1);
      rerender();
    });
    top.appendChild(removeBtn);
    row.appendChild(top);

    if (opts.extra) row.appendChild(opts.extra(item, index));

    const grid = document.createElement('div');
    grid.className = fields.length > 1 ? 'field-row' : '';
    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'field';

      if (f.type === 'checkbox') {
        wrap.className = 'checkbox-field';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!item[f.key];
        input.id = `f-${f.key}-${index}-${Math.random().toString(36).slice(2, 7)}`;
        input.addEventListener('change', () => { item[f.key] = input.checked; });
        const lbl = document.createElement('label');
        lbl.htmlFor = input.id;
        lbl.textContent = f.label;
        wrap.appendChild(input);
        wrap.appendChild(lbl);
      } else {
        const lbl = document.createElement('label');
        lbl.textContent = f.label;
        wrap.appendChild(lbl);

        let input;
        if (f.type === 'textarea') {
          input = document.createElement('textarea');
        } else if (f.type === 'select') {
          input = document.createElement('select');
          (f.options || []).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            input.appendChild(o);
          });
        } else {
          input = document.createElement('input');
          input.type = (f.type === 'number' || f.type === 'tel') ? f.type : 'text';
        }

        const value = opts.primitive ? item : item[f.key];
        input.value = value == null ? '' : value;
        input.addEventListener('input', () => {
          const v = f.type === 'number' ? Number(input.value) : input.value;
          if (opts.primitive) {
            items[index] = v;
          } else {
            item[f.key] = v;
          }
        });
        wrap.appendChild(input);
      }
      grid.appendChild(wrap);
    });
    row.appendChild(grid);
    container.appendChild(row);
  });
}

/* ==================== HERO ==================== */
let hero;
async function initHero() {
  hero = await loadJSON('hero');
  document.getElementById('hero-eyebrow').value = hero.eyebrow || '';
  document.getElementById('hero-heading').value = hero.heading || '';
  document.getElementById('hero-subtitle').value = hero.subtitle || '';
  document.getElementById('hero-primary-btn').value = hero.primaryButtonText || '';
  document.getElementById('hero-secondary-btn').value = hero.secondaryButtonText || '';
  document.getElementById('hero-secondary-link').value = hero.secondaryButtonLink || '';
  hero.stats = hero.stats || [];
  renderHeroStats();
}
function renderHeroStats() {
  renderListEditor(
    document.getElementById('hero-stats-list'),
    hero.stats,
    [{ key: 'number', label: 'Number' }, { key: 'label', label: 'Label' }],
    renderHeroStats,
    { itemLabel: 'Stat' }
  );
}
document.getElementById('hero-stats-add').addEventListener('click', () => {
  hero.stats.push({ number: '', label: '' });
  renderHeroStats();
});
document.getElementById('hero-save').addEventListener('click', async () => {
  hero.eyebrow = document.getElementById('hero-eyebrow').value;
  hero.heading = document.getElementById('hero-heading').value;
  hero.subtitle = document.getElementById('hero-subtitle').value;
  hero.primaryButtonText = document.getElementById('hero-primary-btn').value;
  hero.secondaryButtonText = document.getElementById('hero-secondary-btn').value;
  hero.secondaryButtonLink = document.getElementById('hero-secondary-link').value;
  try { await saveJSON('hero', hero); showMessage('hero', 'Saved.'); }
  catch (e) { showMessage('hero', e.message, true); }
});

/* ==================== ABOUT ==================== */
let about;
const ICONS = ['instructor', 'rto', 'clock', 'shield'];
async function initAbout() {
  about = await loadJSON('about');
  document.getElementById('about-heading').value = about.heading || '';
  document.getElementById('about-subtitle').value = about.subtitle || '';
  about.features = about.features || [];
  renderAboutFeatures();
}
function renderAboutFeatures() {
  renderListEditor(
    document.getElementById('about-features-list'),
    about.features,
    [
      { key: 'icon', label: 'Icon', type: 'select', options: ICONS },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    renderAboutFeatures,
    { itemLabel: 'Feature' }
  );
}
document.getElementById('about-features-add').addEventListener('click', () => {
  about.features.push({ icon: 'instructor', title: '', description: '' });
  renderAboutFeatures();
});
document.getElementById('about-save').addEventListener('click', async () => {
  about.heading = document.getElementById('about-heading').value;
  about.subtitle = document.getElementById('about-subtitle').value;
  try { await saveJSON('about', about); showMessage('about', 'Saved.'); }
  catch (e) { showMessage('about', e.message, true); }
});

/* ==================== GALLERY ==================== */
let gallery;
async function initGallery() {
  gallery = await loadJSON('gallery');
  document.getElementById('gallery-heading').value = gallery.heading || '';
  document.getElementById('gallery-subtitle').value = gallery.subtitle || '';
  gallery.items = gallery.items || [];
  renderGalleryItems();
}
function renderGalleryItems() {
  const container = document.getElementById('gallery-items-list');
  container.innerHTML = '';
  gallery.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'card-row gallery-thumb-row';

    const img = document.createElement('img');
    img.src = '../' + item.src;
    img.alt = '';
    row.appendChild(img);

    const fieldsWrap = document.createElement('div');
    fieldsWrap.className = 'gallery-fields';

    const top = document.createElement('div');
    top.className = 'row-top';
    const label = document.createElement('span');
    label.className = 'row-index';
    label.textContent = 'Image ' + (index + 1);
    top.appendChild(label);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger-ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => { gallery.items.splice(index, 1); renderGalleryItems(); });
    top.appendChild(removeBtn);
    fieldsWrap.appendChild(top);

    const altField = document.createElement('div');
    altField.className = 'field';
    const lbl = document.createElement('label');
    lbl.textContent = 'Alt text (describes the photo)';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.alt || '';
    input.addEventListener('input', () => { item.alt = input.value; });
    altField.appendChild(lbl);
    altField.appendChild(input);
    fieldsWrap.appendChild(altField);

    row.appendChild(fieldsWrap);
    container.appendChild(row);
  });
}
document.getElementById('gallery-upload-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('gallery-upload-file');
  const altInput = document.getElementById('gallery-upload-alt');
  const file = fileInput.files[0];
  if (!file) { showMessage('gallery', 'Choose a photo first.', true); return; }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: reader.result }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      gallery.items.push({ src: body.path, alt: altInput.value || file.name });
      await saveJSON('gallery', gallery);
      renderGalleryItems();
      fileInput.value = '';
      altInput.value = '';
      showMessage('gallery', 'Photo uploaded and added.');
    } catch (e) {
      showMessage('gallery', e.message, true);
    }
  };
  reader.readAsDataURL(file);
});
document.getElementById('gallery-save').addEventListener('click', async () => {
  gallery.heading = document.getElementById('gallery-heading').value;
  gallery.subtitle = document.getElementById('gallery-subtitle').value;
  try { await saveJSON('gallery', gallery); showMessage('gallery', 'Saved.'); }
  catch (e) { showMessage('gallery', e.message, true); }
});

/* ==================== TESTIMONIALS ==================== */
let testimonials;
async function initTestimonials() {
  testimonials = await loadJSON('testimonials');
  document.getElementById('testimonials-heading').value = testimonials.heading || '';
  document.getElementById('testimonials-subtitle').value = testimonials.subtitle || '';
  testimonials.items = testimonials.items || [];
  renderTestimonialItems();
}
function renderTestimonialItems() {
  renderListEditor(
    document.getElementById('testimonials-items-list'),
    testimonials.items,
    [
      { key: 'name', label: 'Student name' },
      { key: 'rating', label: 'Rating (1-5)', type: 'number' },
      { key: 'text', label: 'Testimonial', type: 'textarea' },
    ],
    renderTestimonialItems,
    { itemLabel: 'Testimonial' }
  );
}
document.getElementById('testimonials-items-add').addEventListener('click', () => {
  testimonials.items.push({ name: '', rating: 5, text: '' });
  renderTestimonialItems();
});
document.getElementById('testimonials-save').addEventListener('click', async () => {
  testimonials.heading = document.getElementById('testimonials-heading').value;
  testimonials.subtitle = document.getElementById('testimonials-subtitle').value;
  try { await saveJSON('testimonials', testimonials); showMessage('testimonials', 'Saved.'); }
  catch (e) { showMessage('testimonials', e.message, true); }
});

/* ==================== FAQ ==================== */
let faq;
async function initFaq() {
  faq = await loadJSON('faq');
  document.getElementById('faq-heading').value = faq.heading || '';
  document.getElementById('faq-subtitle').value = faq.subtitle || '';
  faq.items = faq.items || [];
  renderFaqItems();
}
function renderFaqItems() {
  renderListEditor(
    document.getElementById('faq-items-list'),
    faq.items,
    [
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer', type: 'textarea' },
    ],
    renderFaqItems,
    { itemLabel: 'Question' }
  );
}
document.getElementById('faq-items-add').addEventListener('click', () => {
  faq.items.push({ question: '', answer: '' });
  renderFaqItems();
});
document.getElementById('faq-save').addEventListener('click', async () => {
  faq.heading = document.getElementById('faq-heading').value;
  faq.subtitle = document.getElementById('faq-subtitle').value;
  try { await saveJSON('faq', faq); showMessage('faq', 'Saved.'); }
  catch (e) { showMessage('faq', e.message, true); }
});

/* ==================== FEES ==================== */
let fees;
async function initFees() {
  fees = await loadJSON('fees');
  document.getElementById('fees-courses-heading').value = fees.coursesHeading || '';
  document.getElementById('fees-courses-subtitle').value = fees.coursesSubtitle || '';
  document.getElementById('fees-rate-heading').value = fees.rateHeading || '';
  document.getElementById('fees-rate-subtitle').value = fees.rateSubtitle || '';
  fees.courses = fees.courses || [];
  renderFeesCourses();
}
function renderFeesCourses() {
  renderListEditor(
    document.getElementById('fees-courses-list'),
    fees.courses,
    [
      { key: 'name', label: 'Course name' },
      { key: 'price', label: 'Price (e.g. ₹4,500)' },
      { key: 'showAsCard', label: 'Show as a pricing card', type: 'checkbox' },
      { key: 'highlight', label: 'Highlight this card', type: 'checkbox' },
      { key: 'badge', label: 'Badge text (optional, e.g. Most Popular)' },
    ],
    renderFeesCourses,
    { itemLabel: 'Course' }
  );
}
document.getElementById('fees-courses-add').addEventListener('click', () => {
  fees.courses.push({ name: '', price: '', showAsCard: false, highlight: false, badge: '' });
  renderFeesCourses();
});
document.getElementById('fees-save').addEventListener('click', async () => {
  fees.coursesHeading = document.getElementById('fees-courses-heading').value;
  fees.coursesSubtitle = document.getElementById('fees-courses-subtitle').value;
  fees.rateHeading = document.getElementById('fees-rate-heading').value;
  fees.rateSubtitle = document.getElementById('fees-rate-subtitle').value;
  try { await saveJSON('fees', fees); showMessage('fees', 'Saved.'); }
  catch (e) { showMessage('fees', e.message, true); }
});

/* ==================== CONTACT ==================== */
let contact;
async function initContact() {
  contact = await loadJSON('contact');
  document.getElementById('contact-heading').value = contact.heading || '';
  document.getElementById('contact-subtitle').value = contact.subtitle || '';
  document.getElementById('contact-address').value = contact.address || '';
  document.getElementById('contact-hours').value = contact.hours || '';
  document.getElementById('contact-whatsapp').value = contact.whatsappNumber || '';
  document.getElementById('contact-enquiry-email').value = contact.enquiryEmail || '';
  document.getElementById('contact-geo-lat').value = contact.geoLat || '';
  document.getElementById('contact-geo-lng').value = contact.geoLng || '';
  contact.phones = contact.phones || [];
  renderContactPhones();
}
function renderContactPhones() {
  renderListEditor(
    document.getElementById('contact-phones-list'),
    contact.phones,
    [{ key: null, label: 'Phone number', type: 'tel' }],
    renderContactPhones,
    { itemLabel: 'Phone', primitive: true }
  );
}
document.getElementById('contact-phones-add').addEventListener('click', () => {
  contact.phones.push('');
  renderContactPhones();
});
document.getElementById('contact-save').addEventListener('click', async () => {
  contact.heading = document.getElementById('contact-heading').value;
  contact.subtitle = document.getElementById('contact-subtitle').value;
  contact.address = document.getElementById('contact-address').value;
  contact.hours = document.getElementById('contact-hours').value;
  contact.whatsappNumber = document.getElementById('contact-whatsapp').value;
  contact.enquiryEmail = document.getElementById('contact-enquiry-email').value;
  contact.geoLat = document.getElementById('contact-geo-lat').value;
  contact.geoLng = document.getElementById('contact-geo-lng').value;
  try { await saveJSON('contact', contact); showMessage('contact', 'Saved.'); }
  catch (e) { showMessage('contact', e.message, true); }
});

/* ==================== boot ==================== */
Promise.all([
  initHero(), initAbout(), initGallery(), initTestimonials(), initFaq(), initFees(), initContact(),
]).catch(err => console.error('Failed to load admin content:', err));
