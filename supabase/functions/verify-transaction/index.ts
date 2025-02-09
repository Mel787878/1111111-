
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

    // Add a retry mechanism with delay
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} to verify transaction`);
        
        // First try to get transaction details from our database
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('*')
          .eq('transaction_hash', transaction_hash)
          .single();

        if (!transactionData) {
          throw new Error('Transaction not found in database');
        }

        // Get transaction status from TON API
        const tonApiUrl = `https://tonapi.io/v2/blockchain/message/${transaction_hash}`;
        console.log('Making request to:', tonApiUrl);
        
        const tonApiResponse = await fetch(tonApiUrl, {
          headers: {
            'Authorization': `Bearer ${tonApiKey}`,
            'Accept': 'application/json',
          },
        });

        console.log('TonAPI response status:', tonApiResponse.status);
        
        if (!tonApiResponse.ok) {
          const errorText = await tonApiResponse.text();
          console.error('TonAPI error response:', errorText);
          
          if (tonApiResponse.status === 404) {
            console.log('Transaction not found yet, will retry...');
            await sleep(2000); // Wait 2 seconds before retry
            attempts++;
            continue;
          }
          
          throw new Error(`TonAPI returned ${tonApiResponse.status}: ${errorText}`);
        }

        const responseData = await tonApiResponse.json();
        console.log('TonAPI response data:', responseData);

        // Update transaction status in database
        const status = responseData.status === 'sent' ? 'confirmed' : 'failed';
        console.log('Setting transaction status to:', status);

        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status })
          .eq('transaction_hash', transaction_hash);

        if (updateError) {
          console.error('Error updating transaction:', updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({ status }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.log(`Attempt ${attempts + 1} failed:`, error);
        if (attempts === maxAttempts - 1) {
          throw error;
        }
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
