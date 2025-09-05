const fs = require('fs');
const path = require('path');

const retirementBanner = '// retired: replaced by dashboard-guided onboarding\n';
const retirementResponse = `  return NextResponse.json(
    { error: 'Chat onboarding has been retired. Please use dashboard-guided onboarding.' },
    { status: 410 }
  );`;

const routesToRetire = [
  'app/api/onboarding/[userId]/route.ts',
  'app/api/onboarding/sync-state/route.ts',
  'app/api/onboarding/recover-state/route.ts',
  'app/api/onboarding/status/route.ts',
  'app/api/onboarding/complete/route.ts',
  'app/api/onboarding/save-progress/route.ts',
  'app/api/onboarding/log-response/route.ts',
  'app/api/onboarding/analyze-plaid/route.ts',
  'app/api/onboarding/generate-dashboard/route.ts',
  'app/api/onboarding/progress/route.ts',
  'app/api/onboarding/suggestions/route.ts',
  'app/api/onboarding/transfer/route.ts',
  'app/api/onboarding/v2/route.ts',
  'app/api/onboarding/v2/resync/route.ts'
];

routesToRetire.forEach(routePath => {
  const fullPath = path.join(process.cwd(), routePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add retirement banner if not already present
    if (!content.startsWith(retirementBanner)) {
      content = retirementBanner + content;
    }
    
    // Replace export functions with 410 responses
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    methods.forEach(method => {
      const regex = new RegExp(`export async function ${method}\\([^)]*\\)\\s*{`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `export async function ${method}(req: NextRequest) {\n${retirementResponse}\n  /* Retired code below\n`);
        
        // Find and comment out the closing brace
        const functionRegex = new RegExp(`export async function ${method}[\\s\\S]*?^}`, 'gm');
        content = content.replace(functionRegex, (match) => {
          if (!match.includes('/* Retired code below')) return match;
          return match.replace(/}$/, '  */\n}');
        });
      }
    });
    
    fs.writeFileSync(fullPath, content);
    console.log(`Retired: ${routePath}`);
  } else {
    console.log(`Not found: ${routePath}`);
  }
});

console.log('Onboarding routes retirement complete!');