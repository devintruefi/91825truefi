import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Get all Plaid connections for a user
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const connections = await prisma.plaid_connections.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    // Get account counts for each connection
    const connectionsWithAccountCounts = await Promise.all(
      connections.map(async (connection) => {
        const accountCount = await prisma.accounts.count({
          where: {
            user_id: userId,
            institution_name: connection.institution_name,
          },
        });

        return {
          id: connection.id,
          institution_name: connection.institution_name,
          plaid_item_id: connection.plaid_item_id,
          is_active: connection.is_active,
          created_at: connection.created_at,
          last_sync_at: connection.last_sync_at,
          accounts_count: accountCount,
        };
      })
    );

    return NextResponse.json(connectionsWithAccountCounts);
  } catch (error) {
    console.error('Error fetching Plaid connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a Plaid connection and all associated accounts
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const { connectionId } = await req.json();

  try {
    // Get the connection to find the institution name
    const connection = await prisma.plaid_connections.findFirst({
      where: {
        id: connectionId,
        user_id: userId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete all accounts associated with this institution
    await prisma.accounts.deleteMany({
      where: {
        user_id: userId,
        institution_name: connection.institution_name,
      },
    });

    // Delete the Plaid connection
    await prisma.plaid_connections.delete({
      where: { id: connectionId },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Connection and associated accounts deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting Plaid connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
} 