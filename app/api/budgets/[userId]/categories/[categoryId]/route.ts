import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// PUT: Update specific category
export async function PUT(req: NextRequest, { params }: { params: { userId: string; categoryId: string } }) {
  const { categoryId } = params;
  const body = await req.json();
  
  try {
    const { category, amount } = body;

    const updatedCategory = await prisma.budget_categories.update({
      where: { id: categoryId },
      data: {
        category,
        amount,
        updated_at: new Date()
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE: Remove category
export async function DELETE(req: NextRequest, { params }: { params: { userId: string; categoryId: string } }) {
  const { categoryId } = params;
  
  try {
    await prisma.budget_categories.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 