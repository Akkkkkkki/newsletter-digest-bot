const { supabase } = require('../utils/supabase');

/**
 * Update voice priority for a source
 * PUT /api/headlines/voice-priority
 */
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, source_id, voice_priority } = req.body;

    if (!user_id || !source_id || voice_priority === undefined) {
      return res.status(400).json({ error: 'User ID, source ID, and voice priority required' });
    }

    if (voice_priority < 0 || voice_priority > 10) {
      return res.status(400).json({ error: 'Voice priority must be between 0 and 10' });
    }

    const { error } = await supabase
      .from('newsletter_sources')
      .update({ 
        voice_priority: parseInt(voice_priority),
        updated_at: new Date().toISOString()
      })
      .eq('id', source_id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error updating voice priority:', error);
      return res.status(500).json({ error: 'Failed to update voice priority' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Voice priority update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}