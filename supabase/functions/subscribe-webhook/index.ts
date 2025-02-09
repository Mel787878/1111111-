
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const tonApiKey = Deno.env.get('TONAPI_KEY')
    if (!tonApiKey) {
      throw new Error('Missing TONAPI_KEY environment variable')
    }

    // First, create a webhook
    const createWebhookResponse = await fetch('https://rt.tonapi.io/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tonApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'https://khtegkbzwxrwbqpijodg.supabase.co/functions/v1/ton-webhook'
      })
    });

    if (!createWebhookResponse.ok) {
      throw new Error(`Failed to create webhook: ${createWebhookResponse.statusText}`);
    }

    const { webhook_id } = await createWebhookResponse.json();
    console.log('Created webhook with ID:', webhook_id);

    // Then, subscribe to our business wallet
    const subscribeResponse = await fetch(`https://rt.tonapi.io/webhooks/${webhook_id}/account-tx/subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tonApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accounts: [{
          account_id: "UQCt1L-jsQiZ_lpT-PVYVwUVb-rHDuJd-bCN6GdZbL1_qznC"
        }]
      })
    });

    if (!subscribeResponse.ok) {
      throw new Error(`Failed to subscribe to account: ${subscribeResponse.statusText}`);
    }

    console.log('Successfully subscribed to business wallet');

    return new Response(
      JSON.stringify({ success: true, webhook_id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error setting up webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
