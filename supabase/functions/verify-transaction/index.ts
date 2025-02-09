
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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if transaction is already confirmed
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('status')
      .eq('transaction_hash', transaction_hash)
      .single();

    if (existingTransaction?.status === 'confirmed') {
      return new Response(
        JSON.stringify({ status: 'confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call TON API to check transaction status
    const tonApiResponse = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${transaction_hash}`, 
      {
        headers: {
          'Authorization': `Bearer ${tonApiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    // If transaction is not found yet, return pending status
    if (tonApiResponse.status === 404) {
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tonApiResponse.ok) {
      console.error('❌ TON API error:', await tonApiResponse.text());
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to verify transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionData = await tonApiResponse.json();
    console.log('✅ Transaction data:', transactionData);

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
      console.error('❌ Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to update transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

