
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per window
const requestLog = new Map<string, { count: number; timestamp: number }>();

// Zod schema for webhook payload validation
const AccountSchema = z.object({
  address: z.string(),
  is_scam: z.boolean(),
  last_update: z.number(),
  status: z.string(),
  balance: z.string(),
  interfaces: z.array(z.string())
});

const TransactionSchema = z.object({
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
});

const WebhookPayloadSchema = z.object({
  event_id: z.string(),
  timestamp: z.number(),
  account_id: z.string(),
  account: AccountSchema,
  transaction_id: z.string(),
  transaction: TransactionSchema
});

// Allowed TON addresses to monitor
const ALLOWED_ADDRESSES = [
  "UQCt1L-jsQiZ_lpT-PVYVwUVb-rHDuJd-bCN6GdZbL1_qznC",
  // Add more addresses here as needed
].map(addr => addr.toLowerCase());

// Helper function for rate limiting
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const clientData = requestLog.get(ip);

  if (!clientData) {
    requestLog.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    requestLog.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (clientData.count >= MAX_REQUESTS) {
    return false;
  }

  clientData.count++;
  return true;
};

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

  // Rate limiting
  const clientIp = request.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(clientIp.toString())) {
    logEvent('warning', 'Rate limit exceeded', { ip: clientIp });
    return response.status(429).json({ error: 'Too many requests' });
  }

  // API key validation
  const apiKey = process.env.TONAPI_KEY;
  const authHeader = request.headers.authorization;

  if (!apiKey || !authHeader || `Bearer ${apiKey}` !== authHeader) {
    logEvent('error', 'Authentication failed', { authHeader });
    return response.status(401).json({ error: 'Unauthorized' });
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

    logEvent('info', 'Webhook received', {
      event_id: payload.event_id,
      transaction_hash: payload.transaction.hash,
      account_address: payload.account.address,
      value: payload.transaction.value,
      timestamp: payload.timestamp
    });

    // Check if transaction is to one of our monitored addresses
    const txAddress = payload.transaction.account_addr.toLowerCase();
    if (ALLOWED_ADDRESSES.includes(txAddress)) {
      logEvent('info', 'Transaction to monitored address confirmed', {
        address: txAddress,
        value: payload.transaction.value
      });
    } else {
      logEvent('warning', 'Transaction to unmonitored address', {
        received: txAddress,
        allowed: ALLOWED_ADDRESSES
      });
    }

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
