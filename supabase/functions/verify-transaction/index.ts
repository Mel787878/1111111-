
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
    console.log('🔍 Verifying transaction:', transaction_hash);
    
    // Call TON API to check transaction status
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${transaction_hash}`, 
      {
        headers: {
          'Authorization': `Bearer ${tonApiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    const responseData = await response.text();
    console.log('📝 TON API response:', responseData);

    // Handle different response scenarios
    if (response.status === 404) {
      console.log('⏳ Transaction not found yet');
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('❌ TON API error:', responseData);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: `TON API error: ${response.status}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse successful response
    const transactionData = JSON.parse(responseData);
    console.log('✅ Transaction data:', transactionData);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update transaction status in database
    const status = transactionData.status === 'success' ? 'confirmed' : 'failed';
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_hash', transaction_hash);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to update transaction status'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        message: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
