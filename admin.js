let allAppointments = [];
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));

// Simple client passcode authorization (Default: admin123)
const ADMIN_PASSCODE = 'admin123';

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    } else {
        loginModal.show();
    }
});

// Handle Passcode Submission
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredCode = document.getElementById('adminPasscode').value;
    if (enteredCode === ADMIN_PASSCODE) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        loginModal.hide();
        showDashboard();
    } else {
        alert('Incorrect admin passcode! Please try again.');
    }
});

// Logout Handle
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
});

function showDashboard() {
    document.getElementById('dashboardContent').classList.remove('d-none');
    fetchAppointments();
}

// Fetch all appointments from Supabase API
async function fetchAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Loading appointments...</td></tr>`;

    try {
        const response = await fetch('/api/get-appointments');
        const result = await response.json();

        if (response.ok && result.success) {
            allAppointments = result.appointments;
            renderAppointments(allAppointments);
            updateStats(allAppointments);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Error connecting to server.</td></tr>`;
    }
}

// Render data into Bootstrap table
function renderAppointments(data) {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No appointments found.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const badgeClass = getBadgeClass(item.status);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="fw-bold">${escapeHtml(item.full_name)}</td>
            <td><a href="tel:${item.contact_number}" class="text-decoration-none">${escapeHtml(item.contact_number)}</a></td>
            <td>${escapeHtml(item.purok)}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(item.service_type)}</span></td>
            <td>${item.appointment_date}</td>
            <td><span class="badge ${badgeClass}">${item.status || 'Pending'}</span></td>
            <td class="text-center">
                <select class="form-select form-select-sm d-inline-block w-auto" onchange="updateStatus(${item.id}, this.value)">
                    <option value="" disabled selected>Update Status</option>
                    <option value="Approved">Approve</option>
                    <option value="Completed">Mark Complete</option>
                    <option value="Cancelled">Cancel</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update status in Supabase database
async function updateStatus(id, newStatus) {
    try {
        const response = await fetch('/api/get-appointments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });

        if (response.ok) {
            fetchAppointments(); // Reload fresh table data
        } else {
            alert('Failed to update status.');
        }
    } catch (err) {
        alert('Error updating status.');
    }
}

// Calculate summary metrics
function updateStats(data) {
    document.getElementById('statTotal').innerText = data.length;
    document.getElementById('statPending').innerText = data.filter(a => !a.status || a.status === 'Pending').length;
    document.getElementById('statApproved').innerText = data.filter(a => a.status === 'Approved').length;
    document.getElementById('statCompleted').innerText = data.filter(a => a.status === 'Completed').length;
}

// Search and Status Filters
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('refreshBtn').addEventListener('click', fetchAppointments);

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedStatus = document.getElementById('statusFilter').value;

    const filtered = allAppointments.filter(item => {
        const matchesSearch = item.full_name.toLowerCase().includes(searchTerm) ||
                              item.contact_number.includes(searchTerm) ||
                              item.purok.toLowerCase().includes(searchTerm);

        const status = item.status || 'Pending';
        const matchesStatus = (selectedStatus === 'All') || (status === selectedStatus);

        return matchesSearch && matchesStatus;
    });

    renderAppointments(filtered);
}

function getBadgeClass(status) {
    switch (status) {
        case 'Approved': return 'bg-success';
        case 'Completed': return 'bg-secondary';
        case 'Cancelled': return 'bg-danger';
        default: return 'bg-warning text-dark';
    }
}

function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}