import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find employers due for re-verification
    const { data: dueEmployers, error: fetchError } = await supabase
      .from('employers')
      .select('id, company_name, profile_id, next_reverification_at')
      .eq('verification_status', 'approved')
      .lte('next_reverification_at', new Date().toISOString())
      .not('next_reverification_at', 'is', null)

    if (fetchError) throw fetchError

    if (!dueEmployers || dueEmployers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No employers due for re-verification', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0

    for (const employer of dueEmployers) {
      // Reset verification status to pending
      const { error: updateError } = await supabase
        .from('employers')
        .update({
          verification_status: 'pending',
          verification_notes: `Re-verification required. Previous verification expired on ${employer.next_reverification_at}.`,
          next_reverification_at: null,
        })
        .eq('id', employer.id)

      if (updateError) {
        console.error(`Failed to update employer ${employer.id}:`, updateError)
        continue
      }

      // Log admin action
      await supabase.from('admin_action_logs').insert({
        admin_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'reverification_flagged',
        target_type: 'employer',
        target_id: employer.id,
        details: {
          company_name: employer.company_name,
          due_date: employer.next_reverification_at,
          automated: true,
        },
      })

      processed++
    }

    return new Response(
      JSON.stringify({ message: `Flagged ${processed} employers for re-verification`, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Re-verification check error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
