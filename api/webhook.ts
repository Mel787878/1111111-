
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

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

// Improved queue with retry mechanism
interface QueueItem {
  payload: any;
  timestamp: number;
  retryCount: number;
  traceId: string;
}

const webhookQueue: QueueItem[] = [];
const MAX_RETRIES = 3;
const BATCH_SIZE = 5;
const QUEUE_PROCESS_INTERVAL = 1000;

// Calculate exponential backoff delay
const getBackoffDelay = (retryCount: number): number => {
  return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
};

// Process queue with parallel execution
const processQueue = async () => {
  if (webhookQueue.length === 0) return;

  const batch = webhookQueue.splice(0, BATCH_SIZE);
  const processPromises = batch.map(async (item) => {
    try {
      await processWebhook(item);
    } catch (error) {
      if (item.retryCount < MAX_RETRIES) {
        const delay = getBackoffDelay(item.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        webhookQueue.push({
          ...item,
          retryCount: item.retryCount + 1
        });
        logEvent('warning', 'Webhook processing retry scheduled', {
          traceId: item.traceId,
          retryCount: item.retryCount + 1,
          delay
        });
      } else {
        logEvent('error', 'Max retries reached for webhook', {
          traceId: item.traceId,
          error
        });
      }
    }
  });

  await Promise.allSettled(processPromises);
};

// Start queue processing
setInterval(processQueue, QUEUE_PROCESS_INTERVAL);

// Enhanced logging with traceId
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

// Process individual webhook with improved error handling
async function processWebhook(item: QueueItem) {
  try {
    logEvent('info', 'Processing webhook from queue', {
      traceId: item.traceId,
      event_id: item.payload.event_id,
      transaction_hash: item.payload.transaction.hash,
      retryCount: item.retryCount
    });
    
    // Add your webhook processing logic here
    
  } catch (error) {
    logEvent('error', 'Webhook processing error', { 
      traceId: item.traceId,
      error,
      retryCount: item.retryCount
    });
    throw error;
  }
}

// Enhanced API key validation with multiple header support
function validateApiKey(request: VercelRequest): boolean {
  const apiKey = process.env.TONAPI_KEY;
  if (!apiKey) {
    logEvent('warning', 'TONAPI_KEY not configured in environment');
    return false;
  }

  // Support both headers for flexibility
  const providedKey = 
    request.headers['x-ton-api-key'] || 
    request.headers['authorization']?.replace('Bearer ', '');
  
  return apiKey === providedKey;
}

const handler = async (request: VercelRequest, response: VercelResponse) => {
  const traceId = uuidv4();

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Validate request method
  if (request.method !== 'POST') {
    logEvent('error', 'Invalid method', { 
      traceId,
      method: request.method 
    });
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key
  if (!validateApiKey(request)) {
    logEvent('error', 'Invalid or missing API key', { traceId });
    return response.status(401).json({ error: 'Invalid or missing API key' });
  }

  // Validate Content-Type header
  const contentType = request.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    logEvent('error', 'Invalid Content-Type', { 
      traceId,
      received: contentType,
      expected: 'application/json' 
    });
    return response.status(415).json({ 
      error: 'Unsupported Media Type. Content-Type must be application/json' 
    });
  }

  try {
    // Enhanced body parsing with flexible format support
    let body: any;
    if (typeof request.body === 'string') {
      try {
        body = JSON.parse(request.body);
      } catch (error) {
        logEvent('error', 'Failed to parse JSON body', { 
          traceId,
          error,
          body: request.body
        });
        return response.status(400).json({ error: 'Invalid JSON in request body' });
      }
    } else {
      body = request.body;
    }

    if (!body) {
      logEvent('error', 'Empty request body', { traceId });
      return response.status(400).json({ error: 'Empty request body' });
    }

    // Validate webhook payload
    const result = WebhookPayloadSchema.safeParse(body);
    
    if (!result.success) {
      logEvent('error', 'Invalid payload structure', { 
        traceId,
        errors: result.error.issues,
        receivedBody: body
      });
      return response.status(400).json({ 
        error: 'Invalid webhook payload structure',
        details: result.error.issues
      });
    }

    const payload = result.data;

    // Add to processing queue with trace ID
    webhookQueue.push({
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      traceId
    });

    // Log successful webhook receipt with detailed information
    logEvent('info', 'Webhook received and queued', {
      traceId,
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
      traceId,
      queued: true 
    });

  } catch (error) {
    // Enhanced error logging with full error details
    logEvent('error', 'Webhook processing error', { 
      traceId,
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
