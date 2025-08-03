import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-context';

export interface OnboardingData {
  [questionId: string]: string;
}

export function useOnboardingData() {
  const { user } = useUser();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOnboardingData = async () => {
      try {
        const response = await fetch(`/api/onboarding/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setOnboardingData(data.responses);
        }
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [user]);

  return { onboardingData, loading };
} 