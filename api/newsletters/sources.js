if (process.env.NODE_ENV !== 'production' && require.main === module) {
  require('dotenv').config({ path: '.env.local' });
}
const { supabase } = require('../../lib/supabase.node');
const { validation } = require('../../lib/validation');

module.exports = async function handler(req, res) {
  const user_id = req.method === 'GET' ? req.query.user_id : req.body.user_id;
  
  // Validate user_id
  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }
  if (!validation.isValidUuid(user_id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
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
    
    // Validate email format
    if (!validation.isValidEmail(email_address)) {
      return res.status(400).json({ error: 'Invalid email address format' });
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
    
    // Validate email format
    if (!validation.isValidEmail(email_address)) {
      return res.status(400).json({ error: 'Invalid email address format' });
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

if (require.main === module) {
  // Test: GET with missing user_id
  const req1 = { method: 'GET', query: {} };
  const res1 = { status: code => ({ json: obj => console.log('Test1:', code, obj) }) };
  module.exports(req1, res1);

  // Test: POST with missing email_address
  const req2 = { method: 'POST', body: { user_id: 'test' } };
  const res2 = { status: code => ({ json: obj => console.log('Test2:', code, obj) }) };
  module.exports(req2, res2);
} 