
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
    const maxAttempts = 20;
    const initialDelay = 2000;
    
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

        if (!tonApiResponse.ok) {
          const errorText = await tonApiResponse.text();
          console.error('❌ TonAPI error response:', errorText);
          
          if (tonApiResponse.status === 404) {
            console.log('⏳ Transaction not found yet, will retry...');
            await sleep(initialDelay);
            attempts++;
            continue;
          }
          
          // Return a 200 status even for API errors, with error details in the response body
          return new Response(
            JSON.stringify({ 
              error: `TonAPI returned ${tonApiResponse.status}: ${errorText}`,
              status: 'error'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Changed from throwing error to returning 200 with error info
            }
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
            JSON.stringify({ 
              error: updateError.message,
              status: 'error'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Changed from throwing error to returning 200 with error info
            }
          );
        }

        return new Response(
          JSON.stringify({ status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error(`❌ Attempt ${attempts + 1} failed:`, error);
        if (attempts === maxAttempts - 1) {
          return new Response(
            JSON.stringify({ 
              error: error.message,
              status: 'error'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Changed from throwing error to returning 200 with error info
            }
          );
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
        status: 200
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
        status: 200 // Changed from throwing error to returning 200 with error info
      }
    );
  }
});
