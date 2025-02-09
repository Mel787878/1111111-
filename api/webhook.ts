
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Zod schema for webhook payload validation
const WebhookPayloadSchema = z.object({
  event_id: z.string(),
  timestamp: z.number(),
  account_id: z.string(),
  account: z.object({
    address: z.string(),
    is_scam: z.boolean(),
    last_update: z.number(),
    status: z.string(),
    balance: z.string(),
    interfaces: z.array(z.string())
  }),
  transaction_id: z.string(),
  transaction: z.object({
    hash: z.string(),
    lt: z.string(),
    account_addr: z.string(),
    now: z.number(),
    original_value: z.string(),
    original_forwarded_value: z.string(),
    value: z.string(),
    fee: z.string(),
    other_fee: z.string(),
    status: z.string()
  })
});

// Helper function for structured logging
const logEvent = (type: 'info' | 'error' | 'warning', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    type,
    message,
    ...(data && { data })
  }));
};

const handler = async (request: VercelRequest, response: VercelResponse) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Validate request method
  if (request.method !== 'POST') {
    logEvent('error', 'Invalid method', { method: request.method });
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate webhook payload
    const result = WebhookPayloadSchema.safeParse(request.body);
    
    if (!result.success) {
      logEvent('error', 'Invalid payload structure', { 
        errors: result.error.issues 
      });
      return response.status(400).json({ 
        error: 'Invalid webhook payload structure',
        details: result.error.issues
      });
    }

    const payload = result.data;

    // Log successful webhook receipt
    logEvent('info', 'Webhook received', {
      event_id: payload.event_id,
      transaction_hash: payload.transaction.hash,
      account_address: payload.account.address,
      value: payload.transaction.value,
      timestamp: payload.timestamp
    });

    return response.status(200).json({ 
      status: 'success',
      event_id: payload.event_id 
    });

  } catch (error) {
    logEvent('error', 'Webhook processing error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return response.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
