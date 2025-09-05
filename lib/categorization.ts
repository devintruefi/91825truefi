// Enhanced transaction categorization that works with Plaid's detailed taxonomy
export function categorizeTransaction(plaidCategory: string | null): string {
  if (!plaidCategory) return 'Lifestyle';
  
  // Plaid categories are often comma-separated (e.g., "Food and Drink, Restaurants")
  const categories = plaidCategory.toLowerCase().split(',').map(cat => cat.trim());
  const primaryCategory = categories[0];
  
  // Plaid's primary categories and our mapping to main categories
  if (primaryCategory.includes('food') || primaryCategory.includes('restaurant')) {
    return 'Essentials';
  }
  if (primaryCategory.includes('transportation') || primaryCategory.includes('gas station')) {
    return 'Essentials';
  }
  if (primaryCategory.includes('shops') || primaryCategory.includes('general merchandise')) {
    return 'Lifestyle';
  }
  if (primaryCategory.includes('recreation') || primaryCategory.includes('entertainment')) {
    return 'Lifestyle';
  }
  if (primaryCategory.includes('healthcare') || primaryCategory.includes('medical')) {
    return 'Essentials';
  }
  if (primaryCategory.includes('transfer') || primaryCategory.includes('deposit')) {
    // These are often transfers between accounts or income
    return 'Income';
  }
  if (primaryCategory.includes('payment') || primaryCategory.includes('credit card')) {
    // Credit card payments and bill payments
    return 'Essentials';
  }
  if (primaryCategory.includes('investment') || primaryCategory.includes('saving')) {
    return 'Savings';
  }
  if (primaryCategory.includes('rent') || primaryCategory.includes('mortgage')) {
    return 'Essentials';
  }
  
  // Fallback logic for detailed categories
  const essentialKeywords = [
    'groceries', 'utility', 'insurance', 'rent', 'mortgage', 'fuel', 
    'pharmacy', 'doctor', 'hospital', 'education', 'phone', 'internet',
    'electric', 'water', 'housing', 'childcare', 'parking'
  ];
  
  const lifestyleKeywords = [
    'entertainment', 'movie', 'music', 'gym', 'fitness', 'clothing',
    'beauty', 'salon', 'hotel', 'travel', 'bar', 'alcohol', 'coffee',
    'subscription', 'streaming', 'gaming', 'hobby', 'pet', 'book'
  ];
  
  const savingsKeywords = [
    'investment', 'retirement', '401k', 'ira', 'savings', 'stock',
    'bond', 'mutual fund', 'crypto'
  ];
  
  for (const keyword of essentialKeywords) {
    if (primaryCategory.includes(keyword)) return 'Essentials';
  }
  
  for (const keyword of lifestyleKeywords) {
    if (primaryCategory.includes(keyword)) return 'Lifestyle';
  }
  
  for (const keyword of savingsKeywords) {
    if (primaryCategory.includes(keyword)) return 'Savings';
  }
  
  // Default to Lifestyle for unknown categories
  return 'Lifestyle';
}

// Budget-specific categorization for more granular budget categories
export function categorizeBudgetTransaction(plaidCategory: string | null): string {
  if (!plaidCategory) return 'Miscellaneous';
  
  const categories = plaidCategory.toLowerCase().split(',').map(cat => cat.trim());
  const primaryCategory = categories[0];
  
  // Map to specific budget categories
  if (primaryCategory.includes('food') && (primaryCategory.includes('restaurant') || primaryCategory.includes('dining'))) {
    return 'Food & Dining';
  }
  if (primaryCategory.includes('food') || primaryCategory.includes('groceries')) {
    return 'Food & Dining';
  }
  if (primaryCategory.includes('transportation') || primaryCategory.includes('gas station') || primaryCategory.includes('parking')) {
    return 'Transportation';
  }
  if (primaryCategory.includes('rent') || primaryCategory.includes('mortgage') || primaryCategory.includes('housing')) {
    return 'Housing';
  }
  if (primaryCategory.includes('utility') || primaryCategory.includes('electric') || primaryCategory.includes('water') || primaryCategory.includes('internet')) {
    return 'Utilities';
  }
  if (primaryCategory.includes('healthcare') || primaryCategory.includes('medical') || primaryCategory.includes('doctor') || primaryCategory.includes('pharmacy')) {
    return 'Healthcare';
  }
  if (primaryCategory.includes('entertainment') || primaryCategory.includes('movie') || primaryCategory.includes('recreation')) {
    return 'Entertainment';
  }
  if (primaryCategory.includes('shops') || primaryCategory.includes('clothing') || primaryCategory.includes('general merchandise')) {
    return 'Shopping';
  }
  if (primaryCategory.includes('insurance')) {
    return 'Insurance';
  }
  if (primaryCategory.includes('investment') || primaryCategory.includes('saving') || primaryCategory.includes('retirement')) {
    return 'Savings';
  }
  if (primaryCategory.includes('transfer') || primaryCategory.includes('deposit') || primaryCategory.includes('payroll')) {
    return 'Income';
  }
  
  // Keyword-based fallback for detailed categories
  const categoryKeywords: Record<string, string[]> = {
    'Housing': ['rent', 'mortgage', 'home improvement', 'furniture', 'housing'],
    'Transportation': ['transport', 'uber', 'lyft', 'taxi', 'bus', 'train', 'fuel', 'parking'],
    'Food & Dining': ['food', 'restaurant', 'dining', 'grocery', 'coffee', 'bar', 'fast food'],
    'Utilities': ['utility', 'electric', 'water', 'internet', 'phone', 'cable'],
    'Healthcare': ['health', 'medical', 'doctor', 'hospital', 'pharmacy', 'dental'],
    'Entertainment': ['entertainment', 'movie', 'music', 'netflix', 'spotify', 'gaming'],
    'Shopping': ['shop', 'store', 'amazon', 'clothing', 'electronics'],
    'Insurance': ['insurance'],
    'Savings': ['investment', 'retirement', '401k', 'ira', 'savings', 'stock'],
    'Education': ['education', 'tuition', 'books', 'school']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (primaryCategory.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Miscellaneous';
}