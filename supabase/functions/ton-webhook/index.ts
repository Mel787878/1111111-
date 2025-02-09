
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

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()
    console.log('📩 Received webhook payload:', payload)

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query transaction status from TON API with retries
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const tonApiResponse = await fetch(
          `https://tonapi.io/v2/blockchain/transactions/${payload.tx_hash}`,
          {
            headers: {
              'Authorization': `Bearer ${tonApiKey}`,
              'Accept': 'application/json',
            },
          }
        )

        if (!tonApiResponse.ok) {
          const errorText = await tonApiResponse.text()
          console.error('❌ TonAPI error response:', errorText)
          throw new Error(`TonAPI returned ${tonApiResponse.status}: ${errorText}`)
        }

        const transactionData = await tonApiResponse.json()
        console.log('✅ Transaction data:', transactionData)

        // Only update if transaction is finalized (has lt)
        if (!transactionData.lt) {
          console.log('⏳ Transaction not finalized yet, retrying...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          attempts++
          continue
        }

        // Update transaction status in database
        const status = transactionData.status === 'success' ? 'confirmed' : 'failed'
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('transaction_hash', payload.tx_hash)

        if (updateError) {
          console.error('❌ Error updating transaction:', updateError)
          throw updateError
        }

        console.log('✅ Successfully updated transaction status to:', status)
        return new Response(
          JSON.stringify({ success: true, status }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } catch (error) {
        console.error(`❌ Attempt ${attempts + 1} failed:`, error)
        if (attempts === maxAttempts - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
      }
    }

    throw new Error('Max retry attempts reached')

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
