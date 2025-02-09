
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
    
    // Remove 'te6c' prefix if present
    const cleanHash = transaction_hash.replace(/^te6c/, '');
    console.log('🔍 Using clean hash:', cleanHash);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const tonApiResponse = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${cleanHash}`, 
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
      
      return new Response(
        JSON.stringify({ 
          error: `TonAPI returned ${tonApiResponse.status}: ${errorText}`,
          status: tonApiResponse.status === 404 ? 'pending' : 'error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionData = await tonApiResponse.json();
    console.log('✅ Transaction data:', transactionData);

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
        JSON.stringify({ error: updateError.message, status: 'error' }),
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
        error: error.message,
        status: 'error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
