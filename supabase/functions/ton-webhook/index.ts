
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  account_id: string
  lt: number
  tx_hash: string
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

    // Query transaction status from TON API
    const tonApiResponse = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${payload.tx_hash}`,
      {
        headers: {
          'Authorization': `Bearer ${tonApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!tonApiResponse.ok) {
      throw new Error(`Error fetching transaction status: ${tonApiResponse.statusText}`)
    }

    const transactionData = await tonApiResponse.json()
    console.log('Transaction data from TON API:', transactionData)

    // Update transaction status in database
    const status = transactionData.status === 'success' ? 'confirmed' : 'failed'
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_hash', payload.tx_hash)
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
