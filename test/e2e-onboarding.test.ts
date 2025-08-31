/**
 * E2E Onboarding Test - Full flow simulation
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding E2E Flow', () => {
  
  test('Complete onboarding with Plaid and detected income', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
    
    // Sign up or log in
    await page.click('text=Get Started');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for onboarding to start
    await page.waitForSelector('text=Privacy & Consent');
    
    // Step 1: Privacy Consent
    await page.click('text=I Accept');
    
    // Step 2: Welcome
    await expect(page).toHaveText(/Welcome to TrueFi/);
    await page.click('text=Continue');
    
    // Step 3: Main Goal
    await expect(page).toHaveText(/What.*main financial goal/);
    await page.click('text=Grow wealth');
    
    // Step 4: Life Stage
    await expect(page).toHaveText(/life stage/);
    await page.click('text=Working professional');
    
    // Step 5: Family Size
    await expect(page).toHaveText(/family/);
    await page.click('text=Just me');
    
    // Step 6: Location (with typeahead)
    await expect(page).toHaveText(/Where.*located/);
    await page.click('button:has-text("United States")');
    
    // Use the dropdown with typeahead
    await page.click('[role="combobox"]');
    await page.fill('input[placeholder*="Search states"]', 'ca');
    await page.click('text=California');
    await page.click('button:has-text("Continue")');
    
    // Step 7: Household Snapshot
    await expect(page).toHaveText(/household/);
    await page.fill('input[name="partner_income"]', '0');
    await page.fill('input[name="shared_expenses"]', '0');
    await page.fill('input[name="household_net_worth"]', '50000');
    await page.click('button:has-text("Continue")');
    
    // Step 8: Connect Accounts (Plaid)
    await expect(page).toHaveText(/Connect.*accounts/);
    await page.click('button:has-text("Connect with Plaid")');
    
    // Plaid Link sandbox flow
    await page.waitForSelector('iframe[id*="plaid"]', { timeout: 10000 });
    const plaidFrame = page.frameLocator('iframe[id*="plaid"]');
    await plaidFrame.locator('text=Continue').click();
    await plaidFrame.locator('text=First Platypus Bank').click();
    await plaidFrame.locator('input[name="username"]').fill('user_good');
    await plaidFrame.locator('input[name="password"]').fill('pass_good');
    await plaidFrame.locator('button:has-text("Submit")').click();
    await plaidFrame.locator('text=Checking').click();
    await plaidFrame.locator('button:has-text("Continue")').click();
    await plaidFrame.locator('button:has-text("Continue")').click();
    
    // Step 9: Verify Income (should show suggestion)
    await expect(page).toHaveText(/detected.*income/);
    const incomeText = await page.textContent('text=/\\$[0-9,]+/');
    expect(incomeText).toBeTruthy();
    await page.click('text=Use detected income');
    
    // Step 10: Income Structure
    await expect(page).toHaveText(/How often.*paid/);
    await page.click('text=Biweekly');
    await page.fill('input[name="variable_percent"]', '0');
    await page.click('button:has-text("Continue")');
    
    // Step 11: Benefits & Equity
    await expect(page).toHaveText(/benefits/);
    await page.check('text=401(k) match');
    await page.click('button:has-text("Continue")');
    
    // Step 12: Budget Review (should not show 0%)
    await expect(page).toHaveText(/budget/);
    const budgetText = await page.textContent('body');
    expect(budgetText).not.toContain('0% (Under by 100%)');
    expect(budgetText).toMatch(/[1-9][0-9]?%/); // Should have non-zero percentages
    await page.click('button:has-text("Looks good")');
    
    // Step 13: Assets & Liabilities (optional)
    await page.click('text=Skip for now');
    
    // Step 14: Debts (optional)
    await page.click('text=Skip for now');
    
    // Step 15: Housing
    await expect(page).toHaveText(/housing/);
    await page.click('text=Rent');
    
    // Step 16: Insurance
    await expect(page).toHaveText(/insurance/);
    await page.check('text=Health');
    await page.check('text=Auto');
    await page.click('button:has-text("Continue")');
    
    // Step 17: Emergency Fund
    await expect(page).toHaveText(/emergency fund/);
    await page.locator('input[type="range"]').fill('3');
    await page.click('button:has-text("Continue")');
    
    // Step 18: Risk Comfort
    await expect(page).toHaveText(/risk/);
    await page.locator('input[type="range"]').fill('5');
    await page.click('button:has-text("Continue")');
    
    // Step 19: Wrap Up
    await expect(page).toHaveText(/Complete|Congratulations/);
    await page.click('text=Go to Dashboard');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Go back to chat and verify history is preserved
    await page.click('text=Chat');
    await page.waitForSelector('text=Chat History');
    
    // History should not contain system messages
    const chatContent = await page.textContent('.chat-history');
    expect(chatContent).not.toContain('[Component Response:');
    expect(chatContent).not.toContain('buttons:welcome');
    
    // Should contain rich formatted messages
    expect(chatContent).toContain('Privacy & Consent');
    expect(chatContent).toContain('You selected:');
  });
  
  test('Onboarding with manual income entry', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Quick navigation to income step (assuming already logged in)
    // ... navigate through initial steps ...
    
    // At Verify Income step
    await expect(page).toHaveText(/income/);
    await page.click('text=Enter manually');
    
    await page.fill('input[name="monthly_income"]', '6000');
    await page.click('button:has-text("Continue")');
    
    // Should proceed without OUT_OF_SYNC error
    await expect(page).toHaveText(/Income Structure|pay/);
  });
  
  test('Rapid clicking does not cause errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ... navigate to a step ...
    
    // Rapid click the Continue button
    const continueButton = page.locator('button:has-text("Continue")');
    
    // Click 5 times rapidly
    await Promise.all([
      continueButton.click(),
      continueButton.click(),
      continueButton.click(),
      continueButton.click(),
      continueButton.click()
    ]);
    
    // Should still be on valid next step, no errors
    await expect(page).not.toHaveText(/error|failed/i);
    await expect(page).toHaveText(/TrueFi/); // Still in app
  });
  
  test('Progress header updates correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check initial progress
    const initialProgress = await page.textContent('.progress-header');
    expect(initialProgress).toContain('0%');
    expect(initialProgress).toContain('0 items collected');
    
    // Complete a few steps
    // ... complete 5 steps ...
    
    // Check updated progress
    const updatedProgress = await page.textContent('.progress-header');
    expect(updatedProgress).toMatch(/2[0-9]%/); // Should be 20-29%
    expect(updatedProgress).toContain('5 items collected');
    
    // Check "Coming next" is correct
    expect(updatedProgress).toMatch(/Coming next:.*Location/);
  });
});

test.describe('Error Recovery', () => {
  
  test('Handles network interruption gracefully', async ({ page, context }) => {
    await page.goto('http://localhost:3000');
    
    // Start onboarding
    // ... navigate to a step ...
    
    // Simulate network offline
    await context.setOffline(true);
    
    // Try to submit
    await page.click('button:has-text("Continue")');
    
    // Should show error message
    await expect(page).toHaveText(/connection|offline|retry/i);
    
    // Restore network
    await context.setOffline(false);
    
    // Retry should work
    await page.click('button:has-text("Retry")');
    await expect(page).toHaveText(/TrueFi/); // Still in flow
  });
  
  test('Resync recovers from OUT_OF_SYNC', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Simulate OUT_OF_SYNC by manipulating state
    await page.evaluate(() => {
      // Force incorrect step submission
      window.localStorage.setItem('onboarding_step', 'wrong_step');
    });
    
    await page.click('button:has-text("Continue")');
    
    // Should trigger resync
    await expect(page).toHaveText(/syncing|updating/i, { timeout: 5000 });
    
    // Should recover to correct step
    await expect(page).not.toHaveText(/error/i);
    await expect(page).toHaveText(/TrueFi/);
  });
});

// Test configuration
test.use({
  // Set timeout for slow operations
  actionTimeout: 10000,
  
  // Use consistent viewport
  viewport: { width: 1280, height: 720 },
  
  // Enable video recording for debugging
  video: 'retain-on-failure',
  
  // Take screenshots on failure
  screenshot: 'only-on-failure'
});