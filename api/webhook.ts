
import { Hookdeck } from '@hookdeck/vercel';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Zod schema для валидации TON API webhook payload
const TransactionSchema = z.object({
  event_id: z.string(),
  timestamp: z.number(),
  account_id: z.string(),
  account: z.object({
    address: z.string(),
    is_scam: z.boolean(),
    status: z.string(),
    balance: z.string()
  }),
  transaction_id: z.string(),
  transaction: z.object({
    hash: z.string(),
    account_addr: z.string(),
    value: z.string(),
    status: z.string()
  })
});

// Базовое логирование с timestamp
const logEvent = (type: 'info' | 'error', message: string, data?: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type,
    message,
    ...(data && { data })
  }));
};

// Основной handler для webhook
const handler = async (request: VercelRequest, response: VercelResponse) => {
  // Обработка CORS preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Проверка метода
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Верификация webhook с помощью Hookdeck
    const hookdeck = new Hookdeck(process.env.HOOKDECK_SIGNING_SECRET);
    const verified = await hookdeck.verifyWebhook(request);

    if (!verified) {
      logEvent('error', 'Invalid webhook signature');
      return response.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Парсинг и валидация тела запроса
    const result = TransactionSchema.safeParse(request.body);
    
    if (!result.success) {
      logEvent('error', 'Invalid payload structure', { 
        errors: result.error.issues 
      });
      return response.status(400).json({ 
        error: 'Invalid webhook payload',
        details: result.error.issues
      });
    }

    const { transaction, account } = result.data;

    // Логирование важных данных транзакции
    logEvent('info', 'Transaction processed', {
      transaction_id: transaction.hash,
      address: account.address,
      value: transaction.value,
      status: transaction.status
    });

    // Успешный ответ
    return response.status(200).json({
      status: 'success',
      transaction_id: transaction.hash
    });

  } catch (error) {
    // Расширенное логирование ошибок
    logEvent('error', 'Webhook processing error', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Unknown error'
    });

    return response.status(500).json({ 
      error: 'Internal server error',
      retry: true // Флаг для автоматического retry от Hookdeck
    });
  }
};

export const config = {
  runtime: 'edge', // Включаем поддержку Edge Functions
};

export default handler;
