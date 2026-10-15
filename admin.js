// ---------- Settings ----------
// Change these to match the health center.
const ADMIN_PASSCODE = 'admin123';   // Checked in the browser only. See the note about server-side checks.
const DAILY_LIMIT = 20;              // Most appointments the center can accept in one day.
// A day's slots are used up by appointments that are Approved or Completed.

let allAppointments = [];
let activeStatus = 'All';
let reschedTarget = null;            // The appointment being moved

const $ = (id) => document.getElementById(id);
const loginView = $('loginView');
const dashboardView = $('dashboardView');
const passcodeInput = $('adminPasscode');
const tbody = $('appointmentsTableBody');

// ---------- Login ----------
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    } else {
        passcodeInput.focus();
    }
});

$('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (passcodeInput.value.trim() === ADMIN_PASSCODE) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        passcodeInput.classList.remove('is-invalid');
        showDashboard();
    } else {
        passcodeInput.classList.add('is-invalid');
        passcodeInput.select();
    }
});

$('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
});

function showDashboard() {
    loginView.classList.add('d-none');
    dashboardView.classList.remove('d-none');
    fetchAppointments();
}

// ---------- Messages ----------
function showToast(message, type = 'success') {
    const el = $('appToast');
    el.className = 'toast align-items-center border-0 text-bg-' + (type === 'error' ? 'danger' : 'success');
    $('toastMsg').textContent = message;
    bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 }).show();
}

// ---------- Data ----------
async function fetchAppointments() {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading appointments...</td></tr>`;

    try {
        const response = await fetch('/api/get-appointments');
        const result = await response.json();

        if (response.ok && result.success) {
            allAppointments = result.appointments;
            updateStats(allAppointments);
            applyFilters();
        } else {
            showTableMessage('bi-exclamation-triangle', 'Could not load appointments. Press Refresh to try again.');
        }
    } catch (err) {
        showTableMessage('bi-wifi-off', 'Cannot reach the server. Check your connection and press Refresh.');
    }
}

// Send a change to the server. `changes` can hold status and/or appointment_date.
async function saveChanges(id, changes) {
    const response = await fetch('/api/get-appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes })
    });
    return response.ok;
}

async function updateStatus(id, newStatus, button) {
    const item = allAppointments.find((a) => a.id === id);

    // Approving a full day: send staff to the date picker instead
    if (newStatus === 'Approved' && item && confirmedOn(dayOf(item), id) >= DAILY_LIMIT) {
        showToast(`${formatDate(dayOf(item))} is already full. Choose another date for this resident.`, 'error');
        openReschedule(id);
        return;
    }

    if (newStatus === 'Cancelled' && !confirm('Cancel this appointment?')) return;

    if (button) button.disabled = true;
    try {
        if (await saveChanges(id, { status: newStatus })) {
            showToast('Appointment marked as ' + newStatus.toLowerCase() + '.');
            await fetchAppointments();
        } else {
            showToast('Could not update the appointment. Please try again.', 'error');
            if (button) button.disabled = false;
        }
    } catch (err) {
        showToast('Connection problem. The appointment was not updated.', 'error');
        if (button) button.disabled = false;
    }
}

// ---------- Daily capacity ----------
// Date as YYYY-MM-DD, even if the database returns a timestamp
function dayOf(item) {
    return String(item.appointment_date || '').slice(0, 10);
}

// How many slots are already taken on a day (Approved or Completed)
function confirmedOn(date, excludeId) {
    return allAppointments.filter((a) =>
        a.id !== excludeId &&
        dayOf(a) === date &&
        (a.status === 'Approved' || a.status === 'Completed')
    ).length;
}

function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayISO() { return toISO(new Date()); }
function addDays(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return toISO(d);
}

// ---------- Rendering ----------
function showTableMessage(icon, text) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi ${icon}"></i>${escapeHtml(text)}</div></td></tr>`;
}

function renderAppointments(data) {
    $('resultCount').textContent =
        `Showing ${data.length} of ${allAppointments.length} appointment${allAppointments.length === 1 ? '' : 's'}`;

    if (data.length === 0) {
        showTableMessage('bi-calendar-x', allAppointments.length > 0
            ? 'No appointments match your search or filter.'
            : 'No appointment requests yet. New bookings will appear here.');
        return;
    }

    tbody.innerHTML = data.map((item) => {
        const status = item.status || 'Pending';
        const day = dayOf(item);
        // A pending request on a day that has no slots left needs a new date
        const dayFull = status === 'Pending' && confirmedOn(day, item.id) >= DAILY_LIMIT;
        return `
        <tr>
            <td>
                <div class="fw-semibold">${escapeHtml(item.full_name)}</div>
                <div class="sub">${escapeHtml(item.purok)}</div>
            </td>
            <td>
                <a href="tel:${escapeHtml(item.contact_number)}" class="text-decoration-none">
                    <i class="bi bi-telephone me-1"></i>${escapeHtml(item.contact_number)}</a>
                <div class="sub">${item.email
                    ? `<a href="mailto:${escapeHtml(item.email)}" class="text-decoration-none text-muted">${escapeHtml(item.email)}</a>`
                    : 'No email'}</div>
            </td>
            <td>${escapeHtml(item.service_type)}</td>
            <td class="text-nowrap">
                ${formatDate(day)}
                ${dayFull ? '<div><span class="day-full-flag"><i class="bi bi-exclamation-circle me-1"></i>Day is full</span></div>' : ''}
            </td>
            <td><span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span></td>
            <td><div class="d-flex flex-wrap gap-1 justify-content-end">${actionButtons(item.id, status, dayFull)}</div></td>
        </tr>`;
    }).join('');
}

// Only show actions that make sense for the current status
function actionButtons(id, status, dayFull) {
    const approve = `<button class="btn btn-sm btn-primary" data-action="Approved" data-id="${id}"><i class="bi bi-check-lg me-1"></i>Approve</button>`;
    const complete = `<button class="btn btn-sm btn-primary" data-action="Completed" data-id="${id}"><i class="bi bi-clipboard2-check me-1"></i>Mark done</button>`;
    const change = `<button class="btn btn-sm ${dayFull ? 'btn-warning' : 'btn-outline-secondary'}" data-action="Reschedule" data-id="${id}"><i class="bi bi-calendar2-week me-1"></i>Change date</button>`;
    const cancel = `<button class="btn btn-sm btn-outline-danger" data-action="Cancelled" data-id="${id}"><i class="bi bi-x-lg me-1"></i>Cancel</button>`;

    if (status === 'Pending') return `${approve} ${change} ${cancel}`;
    if (status === 'Approved') return `${complete} ${change} ${cancel}`;
    return '<span class="text-muted">No actions</span>';
}

// One listener handles every action button
tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'Reschedule') {
        openReschedule(id);
    } else {
        updateStatus(id, btn.dataset.action, btn);
    }
});

// ---------- Change date (reschedule) ----------
function openReschedule(id) {
    const item = allAppointments.find((a) => a.id === id);
    if (!item) return;
    reschedTarget = item;

    $('reschedName').textContent = item.full_name;
    $('reschedService').textContent = item.service_type + ' - ' + item.purok;
    $('reschedCurrent').textContent = formatDate(dayOf(item));

    const dateInput = $('reschedDate');
    dateInput.min = todayISO();
    dateInput.value = dayOf(item);

    $('reschedStep1').classList.remove('d-none');
    $('reschedFooter1').classList.remove('d-none');
    $('reschedStep2').classList.add('d-none');
    $('reschedFooter2').classList.add('d-none');

    updateCapacity();
    bootstrap.Modal.getOrCreateInstance($('rescheduleModal')).show();
}

// Show how full the chosen day is, and block saving when it cannot be used
function updateCapacity() {
    const box = $('capacityBox');
    const saveBtn = $('reschedSaveBtn');
    const date = $('reschedDate').value;

    if (!date) {
        box.classList.add('d-none');
        saveBtn.disabled = true;
        return;
    }

    const taken = confirmedOn(date, reschedTarget.id);
    const left = DAILY_LIMIT - taken;
    const pct = Math.min(100, Math.round((taken / DAILY_LIMIT) * 100));
    const isCurrent = date === dayOf(reschedTarget);
    const isPast = date < todayISO();

    let cls, icon, msg;
    if (isPast) {
        cls = 'capacity-full'; icon = 'bi-x-circle-fill';
        msg = 'This date has already passed. Choose today or a later date.';
    } else if (left <= 0) {
        cls = 'capacity-full'; icon = 'bi-x-circle-fill';
        msg = `<strong>This day is full.</strong> ${taken} of ${DAILY_LIMIT} slots are taken. Choose another date.`;
    } else if (left <= Math.ceil(DAILY_LIMIT * 0.2)) {
        cls = 'capacity-warn'; icon = 'bi-exclamation-triangle-fill';
        msg = `<strong>Almost full.</strong> ${taken} of ${DAILY_LIMIT} slots taken, ${left} left.`;
    } else {
        cls = 'capacity-ok'; icon = 'bi-check-circle-fill';
        msg = `<strong>Slots available.</strong> ${taken} of ${DAILY_LIMIT} slots taken, ${left} left.`;
    }

    box.className = 'capacity-box mt-3 ' + cls;
    box.innerHTML = `<i class="bi ${icon} me-1"></i>${msg}
        <div class="capacity-bar"><span style="width:${pct}%"></span></div>`;

    saveBtn.disabled = isPast || left <= 0 || isCurrent;
    if (isCurrent && !isPast && left > 0) {
        box.innerHTML += '<div class="small mt-2">This is the current date. Pick a different day to change it.</div>';
    }
}

$('reschedDate').addEventListener('input', updateCapacity);

// Jump to the next day that still has free slots
$('nextAvailableBtn').addEventListener('click', () => {
    let date = $('reschedDate').value || todayISO();
    if (date < todayISO()) date = todayISO();

    for (let i = 0; i < 90; i++) {
        date = addDays(date, 1);
        if (confirmedOn(date, reschedTarget.id) < DAILY_LIMIT) {
            $('reschedDate').value = date;
            updateCapacity();
            return;
        }
    }
    showToast('No free day found in the next 90 days.', 'error');
});

$('reschedSaveBtn').addEventListener('click', async () => {
    const newDate = $('reschedDate').value;
    const item = reschedTarget;
    const oldDate = dayOf(item);
    const btn = $('reschedSaveBtn');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving...';

    try {
        if (await saveChanges(item.id, { appointment_date: newDate })) {
            showRescheduleDone(item, oldDate, newDate);
            fetchAppointments();
        } else {
            showToast('Could not change the date. Please try again.', 'error');
        }
    } catch (err) {
        showToast('Connection problem. The date was not changed.', 'error');
    } finally {
        btn.innerHTML = 'Save new date';
        updateCapacity();
    }
});

// Step 2: offer ready-made messages for the resident
function showRescheduleDone(item, oldDate, newDate) {
    const oldText = formatDate(oldDate, true);
    const newText = formatDate(newDate, true);

    $('reschedDoneText').textContent = `${item.full_name}'s appointment moved from ${oldText} to ${newText}.`;

    const message = `Hello ${item.full_name}, this is Base Camp Health Center. ` +
        `Your ${item.service_type} appointment on ${oldText} could not be accommodated because the day is full. ` +
        `We moved it to ${newText}. Please come on that date. Thank you.`;

    $('notifySms').href = `sms:${item.contact_number}?body=${encodeURIComponent(message)}`;

    const emailLink = $('notifyEmail');
    if (item.email) {
        emailLink.href = `mailto:${item.email}?subject=${encodeURIComponent('Your appointment date was changed')}&body=${encodeURIComponent(message)}`;
        emailLink.classList.remove('disabled');
    } else {
        emailLink.removeAttribute('href');
        emailLink.classList.add('disabled');
    }

    $('reschedStep1').classList.add('d-none');
    $('reschedFooter1').classList.add('d-none');
    $('reschedStep2').classList.remove('d-none');
    $('reschedFooter2').classList.remove('d-none');
}

// ---------- Stats and filters ----------
function updateStats(data) {
    const count = (s) => data.filter((a) => (a.status || 'Pending') === s).length;

    $('statTotal').textContent = data.length;
    $('statPending').textContent = count('Pending');
    $('statApproved').textContent = count('Approved');
    $('statCompleted').textContent = count('Completed');

    document.querySelector('[data-count="All"]').textContent = data.length;
    ['Pending', 'Approved', 'Completed', 'Cancelled'].forEach((s) => {
        document.querySelector(`[data-count="${s}"]`).textContent = count(s);
    });
}

function applyFilters() {
    const term = $('searchInput').value.trim().toLowerCase();

    const filtered = allAppointments.filter((item) => {
        const status = item.status || 'Pending';
        const matchesStatus = activeStatus === 'All' || status === activeStatus;
        const matchesSearch = !term ||
            (item.full_name || '').toLowerCase().includes(term) ||
            (item.contact_number || '').includes(term) ||
            (item.email || '').toLowerCase().includes(term) ||
            (item.purok || '').toLowerCase().includes(term);
        return matchesStatus && matchesSearch;
    });

    renderAppointments(filtered);
}

$('searchInput').addEventListener('input', applyFilters);
$('refreshBtn').addEventListener('click', fetchAppointments);

$('statusPills').addEventListener('click', (e) => {
    const pill = e.target.closest('button[data-status]');
    if (!pill) return;
    activeStatus = pill.dataset.status;
    document.querySelectorAll('#statusPills .btn').forEach((b) => b.classList.toggle('active', b === pill));
    applyFilters();
});

// ---------- Helpers ----------
function statusClass(status) {
    return {
        Approved: 'status-approved',
        Completed: 'status-completed',
        Cancelled: 'status-cancelled'
    }[status] || 'status-pending';
}

function formatDate(isoDate, long = false) {
    if (!isoDate) return '-';
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-PH',
        long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
             : { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}