/**
 * Resync endpoint for onboarding V2 - restores client to server state
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { resync } from '../../v2/route';

// Re-export the resync function as POST handler
export { resync as POST };