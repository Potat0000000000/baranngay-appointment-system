export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    // GET request: Fetch all appointments sorted by creation date
    if (req.method === 'GET') {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/appointments?select=*&order=created_at.desc`, {
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });

            if (!response.ok) throw new Error(await response.text());

            const data = await response.json();
            return res.status(200).json({ success: true, appointments: data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // PATCH request: Update an appointment's status and/or its date
    if (req.method === 'PATCH') {
        try {
            const { id, status, appointment_date } = req.body;

            if (!id) {
                return res.status(400).json({ success: false, error: 'Missing appointment id.' });
            }

            // Only send the fields that were provided
            const changes = {};
            if (status) changes.status = status;
            if (appointment_date) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
                    return res.status(400).json({ success: false, error: 'Invalid date format.' });
                }
                changes.appointment_date = appointment_date;
            }

            if (Object.keys(changes).length === 0) {
                return res.status(400).json({ success: false, error: 'Nothing to update.' });
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(changes)
            });

            if (!response.ok) throw new Error(await response.text());

            const data = await response.json();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}