
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_hash } = await req.json();
    console.log('Received transaction hash:', transaction_hash);

    // Base64 decode the transaction hash if needed
    let decodedHash = transaction_hash;
    try {
      if (transaction_hash.includes('+') || transaction_hash.includes('/')) {
        decodedHash = atob(transaction_hash);
      }
    } catch (e) {
      console.log('Hash is not base64 encoded, using as is');
    }

    // Add a retry mechanism with delay
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} to verify transaction with hash:`, decodedHash);
        
        const tonApiUrl = `https://tonapi.io/v2/blockchain/transactions/${decodedHash}`;
        console.log('Making request to:', tonApiUrl);
        
        const tonApiResponse = await fetch(tonApiUrl, {
          headers: {
            'Authorization': `Bearer ${tonApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('TonAPI response status:', tonApiResponse.status);
        const responseText = await tonApiResponse.text();
        console.log('TonAPI response body:', responseText);

        if (tonApiResponse.status === 404) {
          console.log('Transaction not found yet, waiting...');
          await sleep(2000); // Wait 2 seconds before retry
          attempts++;
          continue;
        }

        if (!tonApiResponse.ok) {
          throw new Error(`TonAPI error: ${tonApiResponse.statusText}. Response: ${responseText}`);
        }

        const transactionData = JSON.parse(responseText);
        console.log('Parsed transaction data:', transactionData);

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Update transaction status in database
        const status = transactionData.status === 'success' ? 'confirmed' : 'failed';
        console.log('Setting transaction status to:', status);

        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status })
          .eq('transaction_hash', transaction_hash);

        if (updateError) {
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
        console.log(`Attempt ${attempts + 1} failed:`, error);
        await sleep(2000); // Wait 2 seconds before retry
        attempts++;
      }
    }

    throw new Error('Max verification attempts reached');
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
