const { supabase } = require('../utils/supabase');

export default async function handler(req, res) {
  const user_id = req.method === 'GET' ? req.query.user_id : req.body.user_id;
  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }

  if (req.method === 'GET') {
    // List all active sources for the user
    const { data, error } = await supabase
      .from('newsletter_sources')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ sources: data || [] });
  }

  if (req.method === 'POST') {
    // Add a new allowed sender (email or domain)
    const { email_address, name, category, description } = req.body;
    if (!email_address) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    // Upsert to avoid duplicates
    const { data, error } = await supabase
      .from('newsletter_sources')
      .upsert({
        user_id,
        email_address: email_address.toLowerCase(),
        name,
        category,
        description,
        is_active: true
      }, { onConflict: ['user_id', 'email_address'] })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ source: data });
  }

  if (req.method === 'DELETE') {
    // Deactivate a sender
    const { email_address } = req.body;
    if (!email_address) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    const { error } = await supabase
      .from('newsletter_sources')
      .update({ is_active: false })
      .eq('user_id', user_id)
      .eq('email_address', email_address.toLowerCase());
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 