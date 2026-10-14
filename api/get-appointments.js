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

    // PATCH request: Update appointment status
    if (req.method === 'PATCH') {
        try {
            const { id, status } = req.body;

            const response = await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ status })
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