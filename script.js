document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

   const formData = {
    full_name: document.getElementById('fullName').value,
    contact_number: document.getElementById('contactNumber').value,
    email: document.getElementById('email').value, // <--- Add this line
    purok: document.getElementById('purok').value,
    service_type: document.getElementById('serviceType').value,
    appointment_date: document.getElementById('appointmentDate').value
};

    try {
        const response = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Success! Your appointment for ${formData.serviceType} on ${formData.appointmentDate} has been booked.`);
            this.reset();
        } else {
            alert('Error booking appointment: ' + (result.error || 'Please try again.'));
        }
    } catch (err) {
        alert('Network error. Please check your connection.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Appointment';
    }

    
});