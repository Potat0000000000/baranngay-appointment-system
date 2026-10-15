const form = document.getElementById('appointmentForm');
const submitBtn = document.getElementById('submitBtn');
const formAlert = document.getElementById('formAlert');
const dateInput = document.getElementById('appointmentDate');
const serviceError = document.getElementById('serviceError');
const successModal = new bootstrap.Modal(document.getElementById('successModal'));

const SUBMIT_LABEL = '<i class="bi bi-send-fill me-2"></i>Send appointment request';

// Do not allow past dates (uses the visitor's local date)
function todayString() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}
dateInput.min = todayString();

// Keep the mobile number to digits only
document.getElementById('contactNumber').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

function formatDate(isoDate) {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function showError(message) {
    formAlert.textContent = message;
    formAlert.classList.remove('d-none');
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Clear the service error once a choice is made
document.querySelectorAll('input[name="serviceType"]').forEach((r) =>
    r.addEventListener('change', () => serviceError.classList.add('d-none'))
);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.classList.add('d-none');

    // Validate (Bootstrap styling)
    const serviceInput = form.querySelector('input[name="serviceType"]:checked');
    serviceError.classList.toggle('d-none', !!serviceInput);
    form.classList.add('was-validated');

    if (!form.checkValidity() || !serviceInput) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
    }

    const formData = {
        full_name: document.getElementById('fullName').value.trim(),
        contact_number: document.getElementById('contactNumber').value.trim(),
        email: document.getElementById('email').value.trim(),
        purok: document.getElementById('purok').value,
        service_type: serviceInput.value,
        appointment_date: dateInput.value
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Sending...';

    try {
        const response = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (response.ok) {
            document.getElementById('sumName').textContent = formData.full_name;
            document.getElementById('sumService').textContent = formData.service_type;
            document.getElementById('sumDate').textContent = formatDate(formData.appointment_date);
            successModal.show();
            form.reset();
            form.classList.remove('was-validated');
        } else {
            showError('We could not send your request. ' + (result.error || 'Please try again.'));
        }
    } catch (err) {
        showError('No internet connection. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = SUBMIT_LABEL;
    }
});