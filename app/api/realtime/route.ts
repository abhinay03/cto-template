import { NextRequest } from 'next/server';
import { db } from '../../../lib/database';
import { requireUserId } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function sseMessage(data: unknown, event?: string): string {
  const lines: string[] = [];
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return `${lines.join('\n')}\n\n`;
}

async function getPayload(userId: string) {
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

  return {
    wordsLearned,
    streakDays: analytics?.streakDays ?? 0,
    totalSessions,
    accuracy: Math.round(avgAccuracy * 100),
    retentionRate: analytics?.retentionRate ?? 0,
    averageTimePerWord: analytics?.averageTimePerWord ?? 0,
    nextReviewCount
  };
}

export async function GET(request: NextRequest) {
  await db.ensureSeeded();

  const userId = await requireUserId(request);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start: async controller => {
      controller.enqueue(encoder.encode(sseMessage({ ok: true }, 'connected')));
      controller.enqueue(encoder.encode(sseMessage(await getPayload(userId), 'analytics')));

      const intervalId = setInterval(async () => {
        try {
          const payload = await getPayload(userId);
          controller.enqueue(encoder.encode(sseMessage(payload, 'analytics')));
        } catch {
          // ignore transient errors
        }
      }, 2000);

      const abort = () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener('abort', abort);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
