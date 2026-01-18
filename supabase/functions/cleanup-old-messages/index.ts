import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    // First, get old messages to find their attachments
    const { data: oldMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .lt('created_at', cutoffDate.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    const messageIds = oldMessages?.map(m => m.id) || [];
    
    // Get attachments for old messages
    if (messageIds.length > 0) {
      const { data: attachments } = await supabase
        .from('message_attachments')
        .select('file_url')
        .in('message_id', messageIds);

      // Delete files from storage
      if (attachments && attachments.length > 0) {
        const filePaths = attachments
          .map(a => {
            const url = a.file_url;
            const match = url.match(/message-attachments\/(.+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('message-attachments')
            .remove(filePaths);

          if (storageError) {
            console.error('Storage cleanup error:', storageError);
          }
        }
      }
    }

    // Delete old messages (attachments cascade delete automatically)
    const { error: deleteError, count } = await supabase
      .from('messages')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (deleteError) {
      throw deleteError;
    }

    // Also cleanup orphaned conversations (no messages)
    const { error: convError } = await supabase.rpc('cleanup_empty_conversations');
    
    if (convError) {
      console.log('Conversation cleanup skipped:', convError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesDeleted: count || 0,
        messageIds: messageIds.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
