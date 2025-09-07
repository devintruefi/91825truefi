import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assets } = await request.json();
    
    if (!assets || typeof assets !== 'object') {
      return NextResponse.json({ error: 'Invalid assets data' }, { status: 400 });
    }

    const createdAssets = [];

    // Handle different asset types
    for (const [key, value] of Object.entries(assets)) {
      if (value && typeof value === 'number' && value > 0) {
        const assetId = uuidv4();
        const assetValue = value as number;
        
        // Create the manual asset
        const asset = await prisma.manual_assets.create({
          data: {
            id: assetId,
            user_id: user.id,
            name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            asset_class: getAssetClass(key),
            value: assetValue,
            notes: `Added during onboarding`,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // Add specific details based on asset type
        if (key === 'home' || key === 'real_estate') {
          await prisma.real_estate_details.create({
            data: {
              id: uuidv4(),
              manual_asset_id: assetId,
              property_type: 'residential',
              is_primary_residence: key === 'home',
              market_value: assetValue,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        } else if (key === 'vehicle' || key === 'car') {
          await prisma.vehicle_assets.create({
            data: {
              id: uuidv4(),
              manual_asset_id: assetId,
              estimated_value: assetValue,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }

        createdAssets.push(asset);
      }
    }

    return NextResponse.json({ 
      success: true, 
      assets: createdAssets,
      message: `${createdAssets.length} assets saved successfully`
    });
  } catch (error) {
    console.error('Error saving assets:', error);
    return NextResponse.json(
      { error: 'Failed to save assets' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assets = await prisma.manual_assets.findMany({
      where: { user_id: user.id },
      include: {
        real_estate_details: true,
        vehicle_assets: true,
        business_ownership_details: true
      },
      orderBy: { created_at: 'desc' }
    });

    const totalAssets = assets.reduce((sum, asset) => 
      sum + (asset.value ? Number(asset.value) : 0), 0
    );

    return NextResponse.json({ 
      assets,
      total: totalAssets
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function getAssetClass(key: string): string {
  const assetClasses: Record<string, string> = {
    home: 'real_estate',
    real_estate: 'real_estate',
    vehicle: 'vehicle',
    car: 'vehicle',
    savings: 'cash',
    checking: 'cash',
    investments: 'securities',
    stocks: 'securities',
    retirement: 'retirement',
    '401k': 'retirement',
    ira: 'retirement',
    business: 'business',
    collectibles: 'other',
    jewelry: 'other',
    other: 'other'
  };
  
  return assetClasses[key.toLowerCase()] || 'other';
}