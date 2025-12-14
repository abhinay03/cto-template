import { NextRequest, NextResponse } from 'next/server';
import { sessionEngine } from '../../../lib/session-engine';
import { db } from '../../../lib/database';

// POST /api/sessions - Create a new daily learning session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, customConfig } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await db.ensureSeeded();

    // Check if user has completed onboarding
    const user = await db.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.vocabularyLevelScore === 0) {
      return NextResponse.json({ 
        error: 'Onboarding test not completed',
        message: 'Please complete the onboarding test before starting a learning session'
      }, { status: 400 });
    }

    // Check for existing active session
    const existingSessions = await db.getUserSessions(userId, 1);
    const activeSession = existingSessions.find(s => !s.isCompleted);

    if (activeSession) {
      return NextResponse.json({
        session: activeSession,
        message: 'You have an active session. Please complete it or start a new one.'
      }, { status: 200 });
    }

    const session = await sessionEngine.createDailySession(userId, customConfig);

    return NextResponse.json({ 
      session,
      message: 'Daily session created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// GET /api/sessions - Get user's sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (sessionId) {
      // Get specific session
      const session = await db.getDailySession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Check if user owns this session
      if (session.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      return NextResponse.json({ session }, { status: 200 });
    }

    // Get user's sessions
    const sessions = await db.getUserSessions(userId, limit);

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}