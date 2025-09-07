import { resolveBudgetCategory, categorizeTransaction, categorizeBudgetTransaction } from '@/lib/categorization';
import prisma from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
  transaction_categories: {
    findFirst: jest.fn()
  }
}));

describe('Budget Categorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Enable the feature flag
    process.env.BUDGETS_DB_MAPPING = 'true';
  });

  describe('resolveBudgetCategory', () => {
    test('User override takes precedence over system default', async () => {
      const mockUserOverride = {
        id: 'user-cat-1',
        category_name: 'Groceries',
        is_system_defined: false
      };

      const mockSystemDefault = {
        id: 'sys-cat-1',
        category_name: 'Food & Dining',
        is_system_defined: true
      };

      // Mock the database calls
      (prisma.transaction_categories.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockUserOverride) // First call for user override
        .mockResolvedValueOnce(mockSystemDefault); // Second call for system default

      const category = await resolveBudgetCategory('user123', 'plaid_food', 'Food and Drink');
      
      expect(category).toBe('Groceries');
      expect(prisma.transaction_categories.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.transaction_categories.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          plaid_category_id: 'plaid_food',
          is_system_defined: false
        }
      });
    });

    test('System default used when no user override exists', async () => {
      const mockSystemDefault = {
        id: 'sys-cat-1',
        category_name: 'Transportation',
        is_system_defined: true
      };

      // Mock the database calls
      (prisma.transaction_categories.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No user override
        .mockResolvedValueOnce(mockSystemDefault); // System default exists

      const category = await resolveBudgetCategory('user123', 'plaid_transport', 'Transportation');
      
      expect(category).toBe('Transportation');
      expect(prisma.transaction_categories.findFirst).toHaveBeenCalledTimes(2);
    });

    test('Fallback to keyword matching when no DB mapping exists', async () => {
      // Mock the database calls to return null (no mappings)
      (prisma.transaction_categories.findFirst as jest.Mock)
        .mockResolvedValue(null);

      const category = await resolveBudgetCategory('user123', null, 'Random Restaurant Name');
      
      // Should fall back to keyword matching in categorizeBudgetTransaction
      expect(category).toBe('Food & Dining'); // Based on 'restaurant' keyword
    });

    test('Returns Miscellaneous for unrecognized categories', async () => {
      // Mock the database calls to return null
      (prisma.transaction_categories.findFirst as jest.Mock)
        .mockResolvedValue(null);

      const category = await resolveBudgetCategory('user123', null, 'Some Unknown Category');
      
      expect(category).toBe('Miscellaneous');
    });

    test('Handles database errors gracefully', async () => {
      // Mock database error
      (prisma.transaction_categories.findFirst as jest.Mock)
        .mockRejectedValue(new Error('Database connection failed'));

      const category = await resolveBudgetCategory('user123', 'plaid_food', 'Food and Drink');
      
      // Should fall back to keyword matching
      expect(category).toBe('Food & Dining');
    });

    test('Respects feature flag when disabled', async () => {
      // Disable the feature flag
      process.env.BUDGETS_DB_MAPPING = 'false';

      const category = await resolveBudgetCategory('user123', 'plaid_food', 'Food and Drink');
      
      // Should not call database at all
      expect(prisma.transaction_categories.findFirst).not.toHaveBeenCalled();
      // Should use the fallback categorization
      expect(category).toBe('Food & Dining');
    });
  });

  describe('categorizeTransaction', () => {
    test('Categorizes food transactions as Essentials', () => {
      const category = categorizeTransaction('Food and Drink, Restaurants');
      expect(category).toBe('Essentials');
    });

    test('Categorizes entertainment as Lifestyle', () => {
      const category = categorizeTransaction('Recreation, Entertainment');
      expect(category).toBe('Lifestyle');
    });

    test('Categorizes investments as Savings', () => {
      const category = categorizeTransaction('Transfer, Investment');
      expect(category).toBe('Savings');
    });

    test('Returns Lifestyle for unknown categories', () => {
      const category = categorizeTransaction('Unknown Category');
      expect(category).toBe('Lifestyle');
    });

    test('Handles null category', () => {
      const category = categorizeTransaction(null);
      expect(category).toBe('Lifestyle');
    });
  });

  describe('categorizeBudgetTransaction', () => {
    test('Maps restaurant transactions to Food & Dining', () => {
      const category = categorizeBudgetTransaction('Food and Drink, Restaurants');
      expect(category).toBe('Food & Dining');
    });

    test('Maps transportation correctly', () => {
      const category = categorizeBudgetTransaction('Transportation, Gas Stations');
      expect(category).toBe('Transportation');
    });

    test('Maps housing transactions', () => {
      const category = categorizeBudgetTransaction('Rent');
      expect(category).toBe('Housing');
    });

    test('Maps healthcare transactions', () => {
      const category = categorizeBudgetTransaction('Healthcare, Pharmacy');
      expect(category).toBe('Healthcare');
    });

    test('Identifies income transactions', () => {
      const category = categorizeBudgetTransaction('Transfer, Deposit, Payroll');
      expect(category).toBe('Income');
    });

    test('Returns Miscellaneous for unrecognized categories', () => {
      const category = categorizeBudgetTransaction('Random Unknown Category');
      expect(category).toBe('Miscellaneous');
    });

    test('Handles null category', () => {
      const category = categorizeBudgetTransaction(null);
      expect(category).toBe('Miscellaneous');
    });
  });
});