document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = {
        fullName: document.getElementById('fullName').value,
        contactNumber: document.getElementById('contactNumber').value,
        purok: document.getElementById('purok').value,
        serviceType: document.getElementById('serviceType').value,
        appointmentDate: document.getElementById('appointmentDate').value
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