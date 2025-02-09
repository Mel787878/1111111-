
import { TonApiClient } from '@ton-api/client';

const tonApi = new TonApiClient({
  baseUrl: 'https://tonapi.io',
  apiKey: 'TONAPI_KEY', // We'll get this from Supabase secrets
});

export default tonApi;
