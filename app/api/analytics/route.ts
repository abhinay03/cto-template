import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';
import { requireUserId } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [analytics, sessions, userWords] = await Promise.all([
      db.getUserAnalytics(userId),
      db.getUserSessions(userId, 1000),
      db.getUserWords(userId)
    ]);

    const completedSessions = sessions.filter(s => s.isCompleted);
    const totalSessions = completedSessions.length;

    const avgAccuracy = totalSessions
      ? completedSessions.reduce((sum, s) => sum + (s.totalWords > 0 ? s.correctAnswers / s.totalWords : 0), 0) / totalSessions
      : 0;

    const wordsLearned = userWords.filter(uw => uw.wordState === 'known' || uw.wordState === 'mastered').length;

    const today = new Date();
    const nextReviewCount = userWords.filter(uw => uw.nextRevisionDate <= today && uw.wordState !== 'mastered').length;

    return NextResponse.json(
      {
        wordsLearned,
        streakDays: analytics?.streakDays ?? 0,
        totalSessions,
        accuracy: Math.round(avgAccuracy * 100),
        retentionRate: analytics?.retentionRate ?? 0,
        averageTimePerWord: analytics?.averageTimePerWord ?? 0,
        nextReviewCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
