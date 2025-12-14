import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';
import { requireUserId, publicUser } from '../../../lib/auth';
import { ContentType, LearningPurpose, ReadingHabit } from '../../../types';

// GET /api/users - Get all users (admin/dev)
export async function GET() {
  try {
    const users = await db.getAllUsers();
    return NextResponse.json({ users: users.map(publicUser) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Update current user's profile
export async function POST(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { primaryLanguage, educationLevel, purpose, readingHabit, preferredContentType } = body;

    if (!primaryLanguage || !educationLevel || !purpose || !readingHabit || !preferredContentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updated = await db.updateUser(userId, {
      primaryLanguage,
      educationLevel,
      purpose: purpose as LearningPurpose,
      readingHabit: readingHabit as ReadingHabit,
      preferredContentType: preferredContentType as ContentType
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: publicUser(updated) }, { status: 200 });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
