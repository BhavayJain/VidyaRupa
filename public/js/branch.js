const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const db = window.supabaseClient;
const { escapeHtml, assetUrl, branchFromRow, feeFromRow } = window.vdData;

function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }

function initNav() {
  const toggle = qs('.nav-toggle');
  const links = qs('.nav-links');
  if (!toggle || !links) return;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  links.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
  }, { threshold: .12 });
  qsa('.reveal').forEach((item) => observer.observe(item));
}

function branchId() {
  return new URLSearchParams(window.location.search).get('id');
}

function renderFees(fees, branch) {
  const branchName = String(branch?.name || '').toLowerCase();
  const visibleFees = branchName.includes('panjabari')
    ? fees
    : fees.filter((fee) => !String(`${fee.level} ${fee.note || ''}`).toLowerCase().includes('panjabari'));

  qs('#feeRows').innerHTML = visibleFees.map((fee) => `
    <tr><td>${escapeHtml(fee.level)}</td><td>${formatFee(fee.admissionFee)}</td><td>${formatFee(fee.monthlyTuition)}</td><td>${formatFee(fee.annualCharges)}</td><td>${escapeHtml(fee.note || (fee.transportFee ? money.format(fee.transportFee) : 'Contact office'))}</td></tr>
  `).join('');
}

function formatFee(value) {
  return Number(value) ? money.format(value) : 'Contact office';
}

function renderBranch(branch) {
  document.title = `${branch.name} | Vidyarupa Discovery Kids`;
  qs('#status').textContent = branch.admissionStatus;
  qs('#branchName').textContent = branch.name;
  qs('#branchDescription').textContent = branch.description || 'A Vidyarupa Discovery learning campus.';
  qs('#branchAddress').textContent = `${branch.address} · ${branch.phone || ''}${branch.email ? ` · ${branch.email}` : ''}`;
  const firstPhone = (branch.phone || '').split(',')[0].replace(/[^0-9+]/g, '');
  qs('#contactButton').href = firstPhone ? `tel:${firstPhone}` : './index.html#booking';
  if (branch.mapUrl) {
    qs('#contactButton').insertAdjacentHTML('afterend', `<a class="btn btn-soft" href="${escapeHtml(branch.mapUrl)}" target="_blank" rel="noopener">Open Map</a>`);
  }
  if (branch.email) {
    qs('#contactButton').insertAdjacentHTML('afterend', `<a class="btn btn-secondary" href="mailto:${escapeHtml(branch.email)}">Email</a>`);
  }

  const heroImages = branch.heroImages?.length ? branch.heroImages : [branch.image || '/images/campus.svg'];
  qs('#heroImages').innerHTML = heroImages.slice(0, 3).map((src, index) => `<img src="${escapeHtml(assetUrl(src))}" alt="${escapeHtml(branch.name)} image ${index + 1}">`).join('');
  qs('#facilityList').innerHTML = (branch.facilities || []).map((facility) => `<li>${escapeHtml(facility)}</li>`).join('');
  renderMap(branch);
  qs('#facultyCards').innerHTML = (branch.faculty || []).map((person) => `
    <article class="card facility">
      <span class="facility-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 4.4-6 8-6s6.2 2 8 6"/></svg></span>
      <h3>${escapeHtml(person.name)}</h3>
      <p class="muted"><strong>${escapeHtml(person.role)}</strong><br>${escapeHtml(person.qualification)}<br>${escapeHtml(person.experience)}</p>
    </article>
  `).join('');
  qs('#galleryImages').innerHTML = (branch.gallery || heroImages).slice(0, 3).map((src, index) => `<img src="${escapeHtml(assetUrl(src))}" alt="${escapeHtml(branch.name)} gallery ${index + 1}">`).join('');
}

function renderMap(branch) {
  const mapCard = qs('#mapCard');
  const mapSection = qs('#mapSection');
  if (!branch.mapUrl && !branch.mapEmbedUrl) {
    mapSection.classList.add('hidden');
    return;
  }
  const embedUrl = branch.mapEmbedUrl || `https://www.google.com/maps?q=${encodeURIComponent(`${branch.name} ${branch.address}`)}&output=embed`;
  mapCard.innerHTML = `
    <iframe class="map-frame" src="${escapeHtml(embedUrl)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${escapeHtml(branch.name)} map"></iframe>
    <div class="map-info">
      <div>
        <h3>${escapeHtml(branch.name)}</h3>
        <p class="muted">${escapeHtml(branch.address)}</p>
      </div>
      <a class="btn btn-primary" href="${escapeHtml(branch.mapUrl || embedUrl)}" target="_blank" rel="noopener">Open Exact Map</a>
    </div>
  `;
}

async function load() {
  if (!db) throw new Error('Supabase is not configured.');
  const [branchResult, feesResult] = await Promise.all([
    db.from('branches').select('*').eq('id', branchId()).single(),
    db.from('fees').select('*').order('monthly_tuition')
  ]);
  if (branchResult.error) throw branchResult.error;
  if (feesResult.error) throw feesResult.error;
  const branch = branchFromRow(branchResult.data);
  renderBranch(branch);
  renderFees(feesResult.data.map(feeFromRow), branch);
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  load().catch(() => {
    qs('#branchPage').innerHTML = '<section class="section"><h1>Branch not found</h1><p class="lead">Please return to branches and choose a campus.</p><a class="btn btn-primary" href="./index.html#branches">View Branches</a></section>';
  });
});
