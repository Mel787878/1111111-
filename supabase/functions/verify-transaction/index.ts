
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_hash } = await req.json();
    console.log('🔍 Received transaction hash:', transaction_hash);

    let attempts = 0;
    const maxAttempts = 3;
    
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
            await sleep(2000);
            attempts++;
            continue;
          }
          
          throw new Error(`TonAPI returned ${tonApiResponse.status}: ${errorText}`);
        }

        const transactionData = await tonApiResponse.json();
        console.log('✅ Transaction data:', transactionData);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const status = transactionData.status === 'success' ? 'confirmed' : 'failed';
        console.log('📝 Setting transaction status to:', status);

        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status })
          .eq('transaction_hash', transaction_hash);

        if (updateError) {
          console.error('❌ Error updating transaction:', updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({ status }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        console.log(`❌ Attempt ${attempts + 1} failed:`, error);
        await sleep(2000);
        attempts++;
      }
    }

    throw new Error('Max verification attempts reached');

  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
