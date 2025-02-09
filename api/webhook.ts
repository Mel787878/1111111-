
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

// Simple in-memory queue for webhook processing
const webhookQueue: Array<{ payload: any, timestamp: number }> = [];
const QUEUE_PROCESS_INTERVAL = 1000; // Process queue every second

// Process queue periodically
setInterval(() => {
  while (webhookQueue.length > 0) {
    const webhook = webhookQueue.shift();
    if (webhook) {
      processWebhook(webhook.payload).catch(error => {
        logEvent('error', 'Queue processing error', { error });
      });
    }
  }
}, QUEUE_PROCESS_INTERVAL);

// Helper function for structured logging with error stack traces
const logEvent = (type: 'info' | 'error' | 'warning', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    type,
    message,
    ...(data && { data }),
    ...(data?.error?.stack && { stack: data.error.stack })
  };
  console.log(JSON.stringify(logData, null, 2));
};

// Process individual webhook
async function processWebhook(payload: any) {
  try {
    // Here you would implement the actual webhook processing logic
    logEvent('info', 'Processing webhook from queue', {
      event_id: payload.event_id,
      transaction_hash: payload.transaction.hash
    });
    
    // Add your webhook processing logic here
    
  } catch (error) {
    logEvent('error', 'Webhook processing error', { error });
    throw error;
  }
}

// Validate TON API key
function validateApiKey(request: VercelRequest): boolean {
  const apiKey = process.env.TONAPI_KEY;
  const providedKey = request.headers['x-ton-api-key'];
  
  if (!apiKey) {
    logEvent('warning', 'TONAPI_KEY not configured in environment');
    return false;
  }
  
  return apiKey === providedKey;
}

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

  // Validate API key
  if (!validateApiKey(request)) {
    logEvent('error', 'Invalid or missing API key');
    return response.status(401).json({ error: 'Invalid or missing API key' });
  }

  // Validate Content-Type header
  const contentType = request.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    logEvent('error', 'Invalid Content-Type', { 
      received: contentType,
      expected: 'application/json' 
    });
    return response.status(415).json({ 
      error: 'Unsupported Media Type. Content-Type must be application/json' 
    });
  }

  try {
    // Ensure request body is properly parsed
    const body = typeof request.body === 'string' 
      ? JSON.parse(request.body) 
      : request.body;

    if (!body) {
      logEvent('error', 'Empty request body');
      return response.status(400).json({ error: 'Empty request body' });
    }

    // Validate webhook payload
    const result = WebhookPayloadSchema.safeParse(body);
    
    if (!result.success) {
      logEvent('error', 'Invalid payload structure', { 
        errors: result.error.issues,
        receivedBody: body
      });
      return response.status(400).json({ 
        error: 'Invalid webhook payload structure',
        details: result.error.issues
      });
    }

    const payload = result.data;

    // Add to processing queue
    webhookQueue.push({
      payload,
      timestamp: Date.now()
    });

    // Log successful webhook receipt with detailed information
    logEvent('info', 'Webhook received and queued', {
      event_id: payload.event_id,
      transaction_hash: payload.transaction.hash,
      account_address: payload.account.address,
      value: payload.transaction.value,
      timestamp: payload.timestamp,
      queue_length: webhookQueue.length
    });

    return response.status(200).json({ 
      status: 'success',
      event_id: payload.event_id,
      queued: true 
    });

  } catch (error) {
    // Enhanced error logging with full error details
    logEvent('error', 'Webhook processing error', { 
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Unknown error'
    });
    return response.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
