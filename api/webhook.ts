
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = request.body;
    
    // Здесь можно добавить валидацию payload
    console.log('Webhook received:', payload);

    // Обработка webhook данных
    // TODO: Добавьте вашу логику обработки

    return response.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
