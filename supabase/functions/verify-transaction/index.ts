
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tonApiKey = Deno.env.get('TONAPI_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_hash } = await req.json();
    console.log('🔍 Received transaction hash:', transaction_hash);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if transaction was already processed
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('status')
      .eq('transaction_hash', transaction_hash)
      .single();

    if (existingTransaction?.status === 'confirmed') {
      console.log('✅ Transaction already confirmed');
      return new Response(
        JSON.stringify({ status: 'confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let attempts = 0;
    const maxAttempts = 20; // Increased max attempts
    const initialDelay = 2000; // Initial delay of 2 seconds
    
    while (attempts < maxAttempts) {
      try {
        console.log(`📡 Attempt ${attempts + 1} to verify transaction`);

        const tonApiResponse = await fetch(
          `https://tonapi.io/v2/blockchain/transactions/${transaction_hash}`, 
          {
            headers: {
              'Authorization': `Bearer ${tonApiKey}`,
              'Accept': 'application/json',
            },
          }
        );

        console.log('📊 TonAPI response status:', tonApiResponse.status);
        
        if (!tonApiResponse.ok) {
          const errorText = await tonApiResponse.text();
          console.error('❌ TonAPI error response:', errorText);
          
          if (tonApiResponse.status === 404) {
            console.log('⏳ Transaction not found yet, will retry...');
            await sleep(initialDelay);
            attempts++;
            continue;
          }
          
          throw new Error(`TonAPI returned ${tonApiResponse.status}: ${errorText}`);
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
          throw updateError;
        }

        return new Response(
          JSON.stringify({ status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error(`❌ Attempt ${attempts + 1} failed:`, error);
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        await sleep(initialDelay);
        attempts++;
      }
    }

    // If we reach here, we've exhausted all attempts
    return new Response(
      JSON.stringify({ 
        error: 'Max verification attempts reached',
        status: 'pending' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 instead of 500 for max attempts
      }
    );

  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 instead of 500 for errors
      }
    );
  }
});
