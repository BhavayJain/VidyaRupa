const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const db = window.supabaseClient;
const { escapeHtml, assetUrl, branchFromRow, branchToRow, feeFromRow, feeToRow, bookingFromRow } = window.vdData;
const state = { session: null, user: null, isAdmin: false, branches: [], fees: [], bookings: [] };
let dashboardRefreshTimer;
let dashboardLoadInProgress = false;

function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function data(form) { return Object.fromEntries(new FormData(form).entries()); }

function showNotice(id, message, ok = true) {
  const node = qs(id);
  node.textContent = message;
  node.className = `notice ${ok ? 'ok' : 'fail'}`;
}

function setView() {
  const loggedIn = Boolean(state.session && state.isAdmin);
  qs('#loginView').classList.toggle('hidden', loggedIn);
  qs('#dashboardView').classList.toggle('hidden', !loggedIn);
}

async function login(event) {
  event.preventDefault();
  try {
    if (!db) throw new Error('Add your Supabase project URL and public key in js/supabase-config.js.');
    const credentials = data(event.currentTarget);
    const { data: result, error } = await db.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
    if (error) throw error;
    const { data: admin, error: adminError } = await db.from('admin_users').select('user_id').eq('user_id', result.user.id).maybeSingle();
    if (adminError || !admin) {
      await db.auth.signOut();
      throw new Error('This account has not been granted admin access.');
    }
    state.session = result.session;
    state.user = result.user;
    state.isAdmin = true;
    setView();
    await loadDashboard();
    startDashboardRefresh();
  } catch (error) {
    showNotice('#loginNotice', error.message, false);
  }
}

function logout() {
  if (db) db.auth.signOut();
  state.session = null;
  state.user = null;
  state.isAdmin = false;
  clearInterval(dashboardRefreshTimer);
  setView();
}

function startDashboardRefresh() {
  clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = setInterval(loadDashboard, 5000);
}

function activateTab(name) {
  qsa('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  qsa('.admin-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${name}`));
}

function renderSummary(summary) {
  qs('#branchCount').textContent = summary.branches;
  qs('#bookingCount').textContent = summary.bookings;
  qs('#pendingCount').textContent = summary.pending;
}

function renderBookings() {
  const wrap = qs('#bookingList');
  if (!state.bookings.length) {
    wrap.innerHTML = '<div class="card form-card"><p class="muted">No booking requests yet.</p></div>';
    return;
  }
  wrap.innerHTML = state.bookings.map((booking) => `
    <article class="booking-row">
      <div>
        <span class="badge ${booking.status === 'Confirmed' ? 'green' : booking.status === 'Rejected' ? '' : 'gold'}">${booking.status}</span>
        <h3>${escapeHtml(booking.studentName)} · ${escapeHtml(booking.branchName || 'Branch')}</h3>
        <p class="muted">Parent: ${escapeHtml(booking.parentName)} · ${escapeHtml(booking.phone)} · ${escapeHtml(booking.email)}</p>
        <p class="muted">Preferred: ${escapeHtml(new Date(booking.preferredDate).toDateString())} at ${escapeHtml(booking.preferredTime)} · Visitors: ${escapeHtml(booking.visitors)}</p>
        <p class="muted">${escapeHtml(booking.message || '')}</p>
      </div>
      <div class="booking-actions">
        <a class="btn btn-secondary btn-small" href="tel:${escapeHtml(booking.phone)}">Call</a>
        <a class="btn btn-secondary btn-small" href="mailto:${escapeHtml(booking.email)}">Email</a>
        <button class="btn btn-soft btn-small" data-booking="${escapeHtml(booking.id)}" data-status="Confirmed">Confirm</button>
        <button class="btn btn-danger btn-small" data-booking="${escapeHtml(booking.id)}" data-status="Rejected">Reject</button>
      </div>
    </article>
  `).join('');
  qsa('[data-booking]', wrap).forEach((button) => button.addEventListener('click', updateBookingStatus));
}

async function updateBookingStatus(event) {
  const button = event.currentTarget;
  const { error } = await db.from('bookings').update({ status: button.dataset.status, updated_at: new Date().toISOString() }).eq('id', button.dataset.booking);
  if (error) throw error;
  await loadDashboard();
}

function renderBranches() {
  qs('#adminBranchCards').innerHTML = state.branches.map((branch) => `
    <article class="card branch-card">
      <img src="${escapeHtml(assetUrl(branch.image || '/images/campus.svg'))}" alt="${escapeHtml(branch.name)}">
      <div class="card-body">
        <span class="badge">${escapeHtml(branch.admissionStatus)}</span>
        <h3>${escapeHtml(branch.name)}</h3>
        <p class="muted">${escapeHtml(branch.address)}</p>
        <button class="btn btn-secondary btn-small" data-edit-branch="${escapeHtml(branch.id)}">Edit branch</button>
      </div>
    </article>
  `).join('');
  qsa('[data-edit-branch]').forEach((button) => button.addEventListener('click', () => editBranch(button.dataset.editBranch)));
}

function editBranch(id) {
  const branch = state.branches.find((item) => item.id === id);
  const form = qs('#branchForm');
  form.elements.id.value = branch.id;
  form.elements.name.value = branch.name || '';
  form.elements.phone.value = branch.phone || '';
  form.elements.email.value = branch.email || '';
  form.elements.address.value = branch.address || '';
  form.elements.mapUrl.value = branch.mapUrl || '';
  form.elements.mapEmbedUrl.value = branch.mapEmbedUrl || '';
  form.elements.admissionStatus.value = branch.admissionStatus || 'Open';
  form.elements.description.value = branch.description || '';
  form.elements.facilities.value = (branch.facilities || []).join('\n');
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveBranch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = data(form);
  const id = values.id;
  const payload = branchToRow({
    name: values.name.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    mapUrl: values.mapUrl.trim(),
    mapEmbedUrl: values.mapEmbedUrl.trim(),
    admissionStatus: values.admissionStatus,
    description: values.description.trim(),
    facilities: values.facilities.split('\n').map((item) => item.trim()).filter(Boolean)
  });
  try {
    const result = id
      ? await db.from('branches').update(payload).eq('id', id)
      : await db.from('branches').insert(payload);
    if (result.error) throw result.error;
    showNotice('#branchNotice', 'Branch saved.');
    form.reset();
    qs('#branchId').value = '';
    await loadDashboard();
  } catch (error) {
    showNotice('#branchNotice', error.message, false);
  }
}

function renderFees() {
  qs('#adminFeeRows').innerHTML = state.fees.map((fee) => `
    <tr>
      <td>${escapeHtml(fee.level)}</td><td>${formatFee(fee.admissionFee)}</td><td>${formatFee(fee.monthlyTuition)}</td><td>${formatFee(fee.annualCharges)}</td><td>${escapeHtml(fee.note || (fee.transportFee ? money.format(fee.transportFee) : 'Contact office'))}</td>
      <td><button class="btn btn-secondary btn-small" data-edit-fee="${escapeHtml(fee.id)}">Edit</button></td>
    </tr>
  `).join('');
  qsa('[data-edit-fee]').forEach((button) => button.addEventListener('click', () => editFee(button.dataset.editFee)));
}

function formatFee(value) {
  return Number(value) ? money.format(value) : 'Contact office';
}

function editFee(id) {
  const fee = state.fees.find((item) => item.id === id);
  const form = qs('#feeForm');
  form.elements.id.value = fee.id;
  form.elements.level.value = fee.level;
  form.elements.admissionFee.value = fee.admissionFee;
  form.elements.monthlyTuition.value = fee.monthlyTuition;
  form.elements.annualCharges.value = fee.annualCharges;
  form.elements.transportFee.value = fee.transportFee || 0;
  form.elements.note.value = fee.note || '';
}

async function saveFee(event) {
  event.preventDefault();
  const payload = data(event.currentTarget);
  const id = payload.id;
  delete payload.id;
  try {
    const result = id
      ? await db.from('fees').update(feeToRow(payload)).eq('id', id)
      : await db.from('fees').insert(feeToRow(payload));
    if (result.error) throw result.error;
    showNotice('#feeNotice', 'Fee row saved.');
    event.currentTarget.reset();
    qs('#feeId').value = '';
    await loadDashboard();
  } catch (error) {
    showNotice('#feeNotice', error.message, false);
  }
}

async function loadDashboard() {
  if (dashboardLoadInProgress || !state.isAdmin || !db) return;
  dashboardLoadInProgress = true;
  try {
    const [branchResult, feeResult, bookingResult] = await Promise.all([
      db.from('branches').select('*').order('created_at'),
      db.from('fees').select('*').order('monthly_tuition'),
      db.from('bookings').select('*').order('created_at', { ascending: false })
    ]);
    if (branchResult.error) throw branchResult.error;
    if (feeResult.error) throw feeResult.error;
    if (bookingResult.error) throw bookingResult.error;
    const branches = branchResult.data.map(branchFromRow);
    const fees = feeResult.data.map(feeFromRow);
    const bookings = bookingResult.data.map(bookingFromRow);
    Object.assign(state, { branches, fees, bookings });
    renderSummary({ branches: branches.length, bookings: bookings.length, pending: bookings.filter((booking) => booking.status === 'Pending').length });
    renderBookings();
    renderBranches();
    renderFees();
  } catch (error) {
    if (/auth|session|token|permission|row-level/i.test(error.message)) logout();
  } finally {
    dashboardLoadInProgress = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  qs('#loginForm').addEventListener('submit', login);
  qs('#logoutButton').addEventListener('click', logout);
  qs('#branchForm').addEventListener('submit', saveBranch);
  qs('#feeForm').addEventListener('submit', saveFee);
  qs('#clearBranchForm').addEventListener('click', () => { qs('#branchForm').reset(); qs('#branchId').value = ''; });
  qs('#clearFeeForm').addEventListener('click', () => { qs('#feeForm').reset(); qs('#feeId').value = ''; });
  qsa('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  setView();
  if (!db) {
    showNotice('#loginNotice', 'Add your Supabase project URL and public key in js/supabase-config.js.', false);
    return;
  }
  db.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!admin) {
      await db.auth.signOut();
      return;
    }
    state.session = session;
    state.user = session.user;
    state.isAdmin = true;
    setView();
    await loadDashboard();
    startDashboardRefresh();
  });
});
