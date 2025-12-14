import { NextRequest, NextResponse } from 'next/server';
import { sessionEngine } from '../../../../../lib/session-engine';
import { db } from '../../../../../lib/database';

// POST /api/sessions/[sessionId]/attempt - Process a session attempt
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { userWordId, userAnswer, isCorrect, timeSpent, confidence, hint } = body;

    if (!sessionId || !userWordId || userAnswer === undefined || isCorrect === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate session exists and user has access
    const session = await db.getDailySession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.isCompleted) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    const attempt = {
      userAnswer,
      isCorrect,
      timeSpent: timeSpent || 0,
      confidence: confidence || 50,
      hint: hint || false
    };

    const result = await sessionEngine.processSessionAttempt(sessionId, userWordId, attempt);

    // Generate feedback for the user
    const feedback = await generateFeedback(isCorrect, userAnswer, userWordId);

    return NextResponse.json({
      result: result.sessionUpdate,
      attemptFeedback: feedback,
      nextActivity: result.nextActivity,
      isSessionComplete: result.sessionUpdate.isCompleted
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing session attempt:', error);
    return NextResponse.json({ error: 'Failed to process attempt' }, { status: 500 });
  }
}

// GET /api/sessions/[sessionId]/attempt - Get session attempts
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const userWordId = searchParams.get('userWordId');

    const session = await db.getDailySession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let attempts = [];
    if (userWordId) {
      const sessionWord = session.words.find(sw => sw.userWordId === userWordId);
      attempts = sessionWord?.attempts || [];
    } else {
      // Get all attempts from session
      attempts = session.words.flatMap(sw => sw.attempts);
    }

    return NextResponse.json({ attempts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching session attempts:', error);
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }
}

async function generateFeedback(isCorrect: boolean, userAnswer: string, userWordId: string) {
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

  let message = '';
  let explanation = '';
  const suggestions: string[] = [];

  if (isCorrect) {
    if (word.meanings.length > 0) {
      message = 'Excellent! You got it right.';
      explanation = word.meanings[0].definition;
    } else {
      message = 'Correct! Well done.';
    }
    
    // Add encouragement for continued learning
    if (Math.random() > 0.5) {
      suggestions.push('Great job! Try to use this word in a sentence.');
    }
  } else {
    message = 'Not quite right. Let\'s try again!';
    
    // Provide helpful explanation
    if (word.meanings.length > 0) {
      explanation = word.meanings[0].definition;
    }
    
    // Suggest different approach
    if (word.semanticMetadata.usageNotes.length > 0) {
      suggestions.push(word.semanticMetadata.usageNotes[0]);
    } else {
      suggestions.push('Think about the context and part of speech.');
    }
    
    // Add mnemonic or memory aid
    if (word.semanticMetadata.commonMistakes.length > 0) {
      suggestions.push(`Common mistake: ${word.semanticMetadata.commonMistakes[0]}`);
    }
  }

  return {
    isCorrect,
    message,
    explanation,
    suggestions
  };
}