import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { createSession, hashPassword, publicUser, setSessionCookie } from '../../../../lib/auth';
import { ContentType, LearningPurpose, ReadingHabit, User } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      email,
      passwordHash: hashPassword(password),
      primaryLanguage: 'English',
      educationLevel: 'other',
      purpose: 'general_improvement' as LearningPurpose,
      readingHabit: 'sometimes' as ReadingHabit,
      preferredContentType: 'mixed' as ContentType,
      vocabularyLevelScore: 0,
      weakAreas: [],
      confidenceScore: 0,
      retentionRiskIndex: 0
    };

    const user = await db.createUser(userData);

    const sessionId = createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 });
  }
}
