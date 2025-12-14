import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { User, LearningPurpose, ReadingHabit, ContentType } from '../../../../types';

// GET /api/users - Get all users (for admin purposes)
export async function GET() {
  try {
    const users: User[] = [];
    // In a real implementation, you'd get users from database
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primaryLanguage, educationLevel, purpose, readingHabit, preferredContentType } = body;

    // Validate required fields
    if (!primaryLanguage || !educationLevel || !purpose || !readingHabit || !preferredContentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user with default values
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      primaryLanguage,
      educationLevel,
      purpose: purpose as LearningPurpose,
      readingHabit: readingHabit as ReadingHabit,
      preferredContentType: preferredContentType as ContentType,
      vocabularyLevelScore: 0,
      weakAreas: [],
      confidenceScore: 0,
      retentionRiskIndex: 0
    };

    const user = await db.createUser(userData);

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    console.error('Error creating user:');
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}