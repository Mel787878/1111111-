
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Интерфейс для валидации данных от TONAPI
interface TonApiWebhookPayload {
  event_id: string;
  timestamp: number;
  account_id: string;
  account: {
    address: string;
    is_scam: boolean;
    last_update: number;
    status: string;
    balance: string;
    interfaces: string[];
  };
  transaction_id: string;
  transaction: {
    hash: string;
    lt: string;
    account_addr: string;
    now: number;
    original_value: string;
    original_forwarded_value: string;
    value: string;
    fee: string;
    other_fee: string;
    status: string;
  };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Обработка CORS preflight запросов
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка API ключа
  const apiKey = process.env.TONAPI_KEY;
  const authHeader = request.headers.authorization;

  if (!apiKey || !authHeader || `Bearer ${apiKey}` !== authHeader) {
    console.error('❌ Invalid or missing API key');
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = request.body as TonApiWebhookPayload;
    
    // Базовая валидация payload
    if (!payload.event_id || !payload.transaction || !payload.account) {
      console.error('❌ Invalid payload structure:', payload);
      return response.status(400).json({ error: 'Invalid webhook payload structure' });
    }

    console.log('📨 Webhook received:', {
      event_id: payload.event_id,
      transaction_hash: payload.transaction.hash,
      account_address: payload.account.address,
      value: payload.transaction.value,
      timestamp: payload.timestamp
    });

    // Проверяем адрес получателя
    const expectedAddress = "UQCt1L-jsQiZ_lpT-PVYVwUVb-rHDuJd-bCN6GdZbL1_qznC";
    if (payload.transaction.account_addr.toLowerCase() === expectedAddress.toLowerCase()) {
      console.log('✅ Transaction to expected address confirmed');
    } else {
      console.log('⚠️ Transaction to unexpected address:', payload.transaction.account_addr);
    }

    return response.status(200).json({ 
      status: 'success',
      event_id: payload.event_id 
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
