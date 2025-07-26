import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function usePlaid() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLinkToken = async (userId: string, userEmail: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.createLinkToken(userId, userEmail);
      return response.link_token;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link token');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const linkAccount = async (userId: string, publicToken: string, institutionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.linkPlaidAccount({
        user_id: userId,
        public_token: publicToken,
        institution_id: institutionId,
      });
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createLinkToken,
    linkAccount,
    loading,
    error,
  };
} 