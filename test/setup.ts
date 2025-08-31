// Test setup file
import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/truefi_app_data';
process.env.JWT_SECRET = 'test-secret-key';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.ONBOARDING_V2 = 'true';

// Mock crypto.randomUUID if not available
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  } as any;
}