
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  event_id: string
  account_id: string
  tx: {
    hash: string
    status: 'pending' | 'confirmed' | 'failed'
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const tonApiKey = Deno.env.get('TONAPI_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!tonApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    // Verify TON API key from headers
    const authHeader = req.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${tonApiKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()
    console.log('Received webhook payload:', payload)

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update transaction status in database
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        status: payload.tx.status,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_hash', payload.tx.hash)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction:', error)
      throw error
    }

    console.log('Successfully updated transaction:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
