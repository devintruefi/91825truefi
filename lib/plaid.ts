import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;
const env = process.env.PLAID_ENV || 'sandbox';

if (!clientId || !secret) {
  throw new Error('Missing Plaid client ID or secret in environment variables');
}

const config = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
    },
  },
});

export const plaidClient = new PlaidApi(config); 