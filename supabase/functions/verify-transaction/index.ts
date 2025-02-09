
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tonApiKey = Deno.env.get('TONAPI_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_hash } = await req.json();
    console.log('🔍 Starting verification for transaction:', transaction_hash);
    
    if (!transaction_hash) {
      console.error('❌ No transaction hash provided');
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Transaction hash is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // First get the message hash from the boc
    console.log('📡 Getting message hash from BOC...');
    let messageResponse;
    try {
      messageResponse = await fetch(
        'https://tonapi.io/v2/blockchain/message',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tonApiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boc: transaction_hash
          })
        }
      );
    } catch (error) {
      console.error('❌ Failed to get message hash:', error);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to get message hash'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!messageResponse.ok) {
      console.error('❌ Message API error:', messageResponse.status);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Message API error'
        }),
        { 
          status: messageResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const messageData = await messageResponse.json();
    const hash = messageData.hash;
    console.log('✅ Got message hash:', hash);

    // Now check transaction status using the hash
    console.log('📡 Checking transaction status...');
    let response;
    try {
      response = await fetch(
        `https://tonapi.io/v2/blockchain/transactions/${hash}`, 
        {
          headers: {
            'Authorization': `Bearer ${tonApiKey}`,
            'Accept': 'application/json',
          },
        }
      );
    } catch (fetchError) {
      console.error('❌ Failed to fetch from TON API:', fetchError);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to connect to TON API'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseText = await response.text();
    console.log(`📝 TON API response (${response.status}):`, responseText);

    // Handle different response scenarios
    if (response.status === 404) {
      console.log('⏳ Transaction not found yet, marking as pending');
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('❌ TON API error:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'TON API error',
          details: responseText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse successful response
    let transactionData;
    try {
      transactionData = JSON.parse(responseText);
      console.log('✅ Parsed transaction data:', transactionData);
    } catch (parseError) {
      console.error('❌ Failed to parse TON API response:', parseError);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Invalid response from TON API'
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client and update transaction status
    console.log('🔄 Updating transaction status in database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const status = transactionData.status === 'success' ? 'confirmed' : 'failed';
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_hash', transaction_hash);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to update transaction status'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Successfully updated transaction status to:', status);
    
    // Return final status
    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error.message || 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
