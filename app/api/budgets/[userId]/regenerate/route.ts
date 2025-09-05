import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateAIBudget } from '@/lib/ai-budget-generator';

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  try {
    const body = await req.json();
    const { framework } = body;
    
    // Don't allow AI regeneration for demo user
    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ 
        error: 'Budget regeneration not available for demo user' 
      }, { status: 400 });
    }
    
    // Get existing budget
    const existingBudget = await prisma.budgets.findFirst({
      where: {
        user_id: userId,
        is_active: true
      }
    });
    
    // Generate new AI budget with specified framework
    const aiResult = await generateAIBudget(userId, framework);
    
    if (aiResult.warnings && aiResult.warnings.length > 0) {
      return NextResponse.json({
        success: false,
        warnings: aiResult.warnings,
        insights: aiResult.insights
      });
    }
    
    if (existingBudget) {
      // Delete existing categories
      await prisma.budget_categories.deleteMany({
        where: { budget_id: existingBudget.id }
      });
      
      // Update existing budget
      await prisma.budgets.update({
        where: { id: existingBudget.id },
        data: {
          name: `AI ${aiResult.framework} Budget`,
          description: `AI-generated budget using ${aiResult.framework} framework`,
          amount: aiResult.totalBudget,
          updated_at: new Date()
        }
      });
      
      // Create new categories
      for (const category of aiResult.categories) {
        await prisma.budget_categories.create({
          data: {
            id: crypto.randomUUID(),
            budget_id: existingBudget.id,
            category: category.category,
            amount: category.amount,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      // Fetch updated budget
      const updatedBudget = await prisma.budgets.findFirst({
        where: { id: existingBudget.id },
        include: {
          budget_categories: {
            orderBy: { created_at: 'asc' }
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        budget: updatedBudget,
        insights: aiResult.insights,
        framework: aiResult.framework
      });
    } else {
      // Create new budget
      const newBudget = await prisma.budgets.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          name: `AI ${aiResult.framework} Budget`,
          description: `AI-generated budget using ${aiResult.framework} framework`,
          amount: aiResult.totalBudget,
          period: 'monthly',
          start_date: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          budget_categories: {
            create: aiResult.categories.map(category => ({
              id: crypto.randomUUID(),
              category: category.category,
              amount: category.amount,
              created_at: new Date(),
              updated_at: new Date()
            }))
          }
        },
        include: {
          budget_categories: {
            orderBy: { created_at: 'asc' }
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        budget: newBudget,
        insights: aiResult.insights,
        framework: aiResult.framework
      });
    }
  } catch (error) {
    console.error('Error regenerating budget:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate budget' },
      { status: 500 }
    );
  }
}