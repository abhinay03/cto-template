import { NextRequest, NextResponse } from 'next/server';
import { sessionEngine } from '../../../../../lib/session-engine';
import { db } from '../../../../../lib/database';
import { requireUserId } from '../../../../../lib/auth';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

function similarity(a: string, b: string): number {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) intersection++;
  }

  return intersection / Math.max(aTokens.size, bTokens.size);
}

function evaluateAttemptForActivity(
  activityType: string,
  wordText: string,
  expectedDefinition: string,
  expectedTranslation: string,
  userAnswer: string
): boolean {
  const normAnswer = normalize(userAnswer);
  if (!normAnswer) return false;

  const normWord = normalize(wordText);
  if ((activityType === 'sentence_building' || activityType === 'story_usage') && normWord) {
    return normalize(userAnswer).includes(normWord);
  }

  const normDef = normalize(expectedDefinition);
  const normTrans = normalize(expectedTranslation);

  if (normTrans && (normAnswer === normTrans || normTrans.includes(normAnswer) || normAnswer.includes(normTrans))) {
    return true;
  }

  if (normDef && (normAnswer === normDef || normDef.includes(normAnswer) || normAnswer.includes(normDef))) {
    return true;
  }

  return similarity(userAnswer, expectedDefinition) >= 0.45;
}

async function generateFeedback(isCorrect: boolean, userWordId: string) {
  const userWord = await db.getUserWordById(userWordId);
  const word = userWord ? await db.getWord(userWord.wordId) : null;

  if (!word) {
    return {
      isCorrect,
      message: isCorrect ? 'Correct!' : 'Incorrect.',
      explanation: '',
      suggestions: []
    };
  }

  const definition = word.meanings[0]?.definition ?? '';

  if (isCorrect) {
    return {
      isCorrect,
      message: 'Excellent! You got it right.',
      explanation: definition,
      suggestions: ['Try to use this word in a sentence to strengthen retention.']
    };
  }

  const suggestions: string[] = [];
  if (word.semanticMetadata.usageNotes[0]) suggestions.push(word.semanticMetadata.usageNotes[0]);
  if (word.semanticMetadata.commonMistakes[0]) suggestions.push(`Common mistake: ${word.semanticMetadata.commonMistakes[0]}`);
  if (suggestions.length === 0) suggestions.push('Review the definition and try again with the word in context.');

  return {
    isCorrect,
    message: 'Not quite right. Let\'s try again!',
    explanation: definition,
    suggestions
  };
}

// POST /api/sessions/[sessionId]/attempt - Process a session attempt
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await db.ensureSeeded();

    const authUserId = await requireUserId(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const body = await request.json();
    const { userWordId, userAnswer, timeSpent, confidence, hint } = body;

    if (!sessionId || !userWordId || userAnswer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = await db.getDailySession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.userId !== authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (session.isCompleted) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    const sessionWord = session.words.find(sw => sw.userWordId === userWordId);
    if (!sessionWord) {
      return NextResponse.json({ error: 'Session word not found' }, { status: 404 });
    }

    const userWord = await db.getUserWordById(userWordId);
    if (!userWord || userWord.userId !== authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const word = await db.getWord(userWord.wordId);
    if (!word) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    const expectedDefinition = word.meanings[0]?.definition ?? '';
    const expectedTranslation = word.meanings[0]?.translation ?? '';

    const isCorrect = evaluateAttemptForActivity(
      sessionWord.activityType,
      word.word,
      expectedDefinition,
      expectedTranslation,
      String(userAnswer)
    );

    const attempt = {
      userAnswer: String(userAnswer),
      isCorrect,
      timeSpent: typeof timeSpent === 'number' ? timeSpent : 0,
      confidence: typeof confidence === 'number' ? confidence : 70,
      hint: Boolean(hint)
    };

    const result = await sessionEngine.processSessionAttempt(sessionId, userWordId, attempt);

    const feedback = await generateFeedback(isCorrect, userWordId);

    return NextResponse.json(
      {
        result: result.sessionUpdate,
        isCorrect,
        attemptFeedback: feedback,
        nextActivity: result.nextActivity,
        isSessionComplete: result.sessionUpdate.isCompleted
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing session attempt:', error);
    return NextResponse.json({ error: 'Failed to process attempt' }, { status: 500 });
  }
}

// GET /api/sessions/[sessionId]/attempt - Get session attempts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await db.ensureSeeded();

    const authUserId = await requireUserId(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userWordId = searchParams.get('userWordId');

    const session = await db.getDailySession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.userId !== authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const attempts = userWordId
      ? session.words.find(sw => sw.userWordId === userWordId)?.attempts || []
      : session.words.flatMap(sw => sw.attempts);

    return NextResponse.json({ attempts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching session attempts:', error);
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }
}
