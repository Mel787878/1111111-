
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
    const { boc } = await req.json();
    console.log('🔍 Starting verification for BOC:', boc);
    
    if (!boc) {
      console.error('❌ No BOC provided');
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'BOC is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse message from the BOC
    console.log('📡 Getting transaction hash from BOC...');
    let messageResponse;
    try {
      messageResponse = await fetch(
        'https://tonapi.io/v2/blockchain/parse/message', 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tonApiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boc: boc
          })
        }
      );
    } catch (fetchError) {
      console.error('❌ Failed to parse message from TON API:', fetchError);
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

    if (!messageResponse.ok) {
      console.error('❌ TON API message error:', messageResponse.status);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Failed to parse message from BOC'
        }),
        { 
          status: messageResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const parsedMessage = await messageResponse.json();
    console.log('✅ Parsed message:', parsedMessage);

    // Wait a bit for the transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find transaction by source and destination
    console.log('📡 Finding transaction...');
    let txResponse;
    try {
      txResponse = await fetch(
        `https://tonapi.io/v2/blockchain/accounts/${parsedMessage.source}/transactions?to_lt=0`, 
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

    const txData = await txResponse.json();
    console.log('📝 Transactions:', txData);

    if (!txResponse.ok || !txData.transactions || txData.transactions.length === 0) {
      console.log('⏳ Transaction not found yet, marking as pending');
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the matching transaction
    const transaction = txData.transactions.find(tx => 
      tx.out_msgs.some(msg => 
        msg.destination === parsedMessage.destination && 
        msg.value === parsedMessage.value
      )
    );

    if (!transaction) {
      console.log('⏳ Matching transaction not found yet, marking as pending');
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client and update transaction status
    console.log('🔄 Updating transaction status in database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const status = transaction.success ? 'confirmed' : 'failed';
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status,
        transaction_lt: transaction.lt,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_hash', boc);

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
