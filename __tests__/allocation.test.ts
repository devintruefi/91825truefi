import { 
  calculateAvailableFunds, 
  allocateByPriority, 
  validateAllocation,
  getAccountSnapshot 
} from '@/lib/goals/allocation';
import prisma from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
  accounts: {
    findMany: jest.fn()
  },
  users: {
    findUnique: jest.fn()
  }
}));

describe('Goal Allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAvailableFunds', () => {
    test('Calculates available funds correctly with checking buffer', async () => {
      // Mock liquid accounts
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 5000,
          available_balance: 4800,
          is_active: true
        },
        {
          id: 'acc2',
          type: 'depository',
          subtype: 'savings',
          balance: 10000,
          available_balance: 10000,
          is_active: true
        }
      ];

      // Mock user with checking buffer
      const mockUser = {
        id: 'user123',
        default_checking_buffer: 2000
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const available = await calculateAvailableFunds('user123');
      
      // Total available: 4800 + 10000 = 14800
      // Minus buffer: 14800 - 2000 = 12800
      expect(available).toBe(12800);
    });

    test('Never returns negative available funds', async () => {
      // Mock accounts with low balance
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 500,
          available_balance: 500,
          is_active: true
        }
      ];

      // Mock user with high buffer
      const mockUser = {
        id: 'user123',
        default_checking_buffer: 5000
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const available = await calculateAvailableFunds('user123');
      
      // Should return 0, not negative
      expect(available).toBe(0);
    });

    test('Uses balance when available_balance is null', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 3000,
          available_balance: null, // No available balance
          is_active: true
        }
      ];

      const mockUser = {
        id: 'user123',
        default_checking_buffer: 1000
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const available = await calculateAvailableFunds('user123');
      
      // Should use balance: 3000 - 1000 = 2000
      expect(available).toBe(2000);
    });

    test('Uses default buffer when user has none set', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 5000,
          available_balance: 5000,
          is_active: true
        }
      ];

      // User without buffer setting
      const mockUser = {
        id: 'user123',
        default_checking_buffer: null
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const available = await calculateAvailableFunds('user123');
      
      // Should use default buffer of 2000: 5000 - 2000 = 3000
      expect(available).toBe(3000);
    });
  });

  describe('allocateByPriority', () => {
    test('Allocates funds by priority order', async () => {
      const goals = [
        {
          id: 'goal1',
          name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 5000,
          allocation_priority: 1 // Highest priority
        },
        {
          id: 'goal2',
          name: 'Vacation',
          target_amount: 3000,
          current_amount: 1000,
          allocation_priority: 2
        },
        {
          id: 'goal3',
          name: 'New Car',
          target_amount: 20000,
          current_amount: 10000,
          allocation_priority: 3
        }
      ];

      const available = 8000;
      const allocations = await allocateByPriority(goals, available);
      
      // Goal 1 needs 5000, gets 5000
      expect(allocations.get('goal1')).toBe(5000);
      // Goal 2 needs 2000, gets 2000
      expect(allocations.get('goal2')).toBe(2000);
      // Goal 3 needs 10000, gets remaining 1000
      expect(allocations.get('goal3')).toBe(1000);
    });

    test('Stops allocating when funds are exhausted', async () => {
      const goals = [
        {
          id: 'goal1',
          name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 0,
          allocation_priority: 1
        },
        {
          id: 'goal2',
          name: 'Vacation',
          target_amount: 3000,
          current_amount: 0,
          allocation_priority: 2
        }
      ];

      const available = 5000;
      const allocations = await allocateByPriority(goals, available);
      
      // Goal 1 needs 10000, gets all 5000
      expect(allocations.get('goal1')).toBe(5000);
      // Goal 2 gets nothing
      expect(allocations.get('goal2')).toBeUndefined();
    });

    test('Handles goals with null allocation_priority', async () => {
      const goals = [
        {
          id: 'goal1',
          name: 'Goal with priority',
          target_amount: 1000,
          current_amount: 0,
          allocation_priority: 1
        },
        {
          id: 'goal2',
          name: 'Goal without priority',
          target_amount: 1000,
          current_amount: 0,
          allocation_priority: null // No priority set
        }
      ];

      const available = 1500;
      const allocations = await allocateByPriority(goals, available);
      
      // Goal 1 with priority gets funded first
      expect(allocations.get('goal1')).toBe(1000);
      // Goal 2 with null priority gets remaining
      expect(allocations.get('goal2')).toBe(500);
    });

    test('Does not allocate to fully funded goals', async () => {
      const goals = [
        {
          id: 'goal1',
          name: 'Already Funded',
          target_amount: 5000,
          current_amount: 5000, // Already at target
          allocation_priority: 1
        },
        {
          id: 'goal2',
          name: 'Needs Funding',
          target_amount: 3000,
          current_amount: 1000,
          allocation_priority: 2
        }
      ];

      const available = 5000;
      const allocations = await allocateByPriority(goals, available);
      
      // Goal 1 needs 0, gets 0
      expect(allocations.get('goal1')).toBeUndefined();
      // Goal 2 needs 2000, gets 2000
      expect(allocations.get('goal2')).toBe(2000);
    });
  });

  describe('validateAllocation', () => {
    test('Returns true when allocations are within available funds', async () => {
      // Mock available funds calculation
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 10000,
          available_balance: 10000,
          is_active: true
        }
      ];
      const mockUser = {
        id: 'user123',
        default_checking_buffer: 2000
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const allocations = new Map([
        ['goal1', 3000],
        ['goal2', 2000]
      ]);

      const isValid = await validateAllocation(allocations, 'user123');
      
      // Total allocated: 5000, Available: 8000 (10000 - 2000)
      expect(isValid).toBe(true);
    });

    test('Returns false when allocations exceed available funds', async () => {
      // Mock available funds calculation
      const mockAccounts = [
        {
          id: 'acc1',
          type: 'depository',
          subtype: 'checking',
          balance: 5000,
          available_balance: 5000,
          is_active: true
        }
      ];
      const mockUser = {
        id: 'user123',
        default_checking_buffer: 2000
      };

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const allocations = new Map([
        ['goal1', 3000],
        ['goal2', 2000]
      ]);

      const isValid = await validateAllocation(allocations, 'user123');
      
      // Total allocated: 5000, Available: 3000 (5000 - 2000)
      expect(isValid).toBe(false);
    });
  });

  describe('getAccountSnapshot', () => {
    test('Returns account snapshot for allocation history', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          name: 'Main Checking',
          balance: 5000,
          available_balance: 4800,
          type: 'depository',
          subtype: 'checking'
        },
        {
          id: 'acc2',
          name: 'Savings Account',
          balance: 10000,
          available_balance: 10000,
          type: 'depository',
          subtype: 'savings'
        }
      ];

      (prisma.accounts.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      const snapshot = await getAccountSnapshot('user123');
      
      expect(snapshot).toHaveLength(2);
      expect(snapshot[0]).toMatchObject({
        id: 'acc1',
        name: 'Main Checking',
        balance: 5000,
        available_balance: 4800
      });
      expect(snapshot[1]).toMatchObject({
        id: 'acc2',
        name: 'Savings Account',
        balance: 10000,
        available_balance: 10000
      });
    });
  });
});