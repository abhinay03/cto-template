import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { getUserIdFromRequest, publicUser } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await db.getUser(userId);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: publicUser(user) }, { status: 200 });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
