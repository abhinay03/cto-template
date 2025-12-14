import { NextRequest, NextResponse } from 'next/server';
import { onboardingEngine } from '../../../lib/onboarding-engine';
import { db } from '../../../lib/database';

// POST /api/onboarding - Start a new onboarding test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'start') {
      // Start a new onboarding test
      const test = await onboardingEngine.startOnboardingTest(userId);
      const nextQuestion = await onboardingEngine.getNextQuestion(test.id);
      
      return NextResponse.json({
        test,
        nextQuestion,
        message: 'Onboarding test started successfully'
      }, { status: 201 });
    }

    if (action === 'submit') {
      // Submit an answer to the current question
      const { testId, answer } = body;
      
      if (!testId || !answer) {
        return NextResponse.json({ error: 'Test ID and answer are required' }, { status: 400 });
      }

      const submitted = await onboardingEngine.submitAnswer(testId, answer);
      if (!submitted) {
        return NextResponse.json({ error: 'Failed to submit answer' }, { status: 400 });
      }

      // Get the next question or complete the test
      const nextQuestion = await onboardingEngine.getNextQuestion(testId);
      
      if (!nextQuestion) {
        // Test is complete, get results
        const results = await onboardingEngine.completeOnboarding(testId);
        
        // Update user with onboarding results
        const user = await db.getUser(userId);
        if (user) {
          await db.updateUser(userId, {
            vocabularyLevelScore: results.vocabularyLevelScore,
            weakAreas: results.weakAreas,
            confidenceScore: results.confidenceScore,
            retentionRiskIndex: results.retentionRiskIndex
          });
        }

        const cefrLevel = onboardingEngine.getCEFRLevel(results.vocabularyLevelScore);

        return NextResponse.json({
          isCompleted: true,
          results,
          cefrLevel,
          message: 'Onboarding test completed successfully'
        }, { status: 200 });
      }

      return NextResponse.json({
        testId,
        nextQuestion,
        message: 'Answer submitted successfully'
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/onboarding - Get user's onboarding test status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const test = await db.getOnboardingTest(userId);
    
    if (!test) {
      return NextResponse.json({ 
        hasOnboardingTest: false,
        message: 'No onboarding test found for user'
      }, { status: 200 });
    }

    const nextQuestion = test.isCompleted ? null : await onboardingEngine.getNextQuestion(test.id);

    return NextResponse.json({
      test,
      nextQuestion,
      hasOnboardingTest: true,
      isCompleted: test.isCompleted
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching onboarding test:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding test' }, { status: 500 });
  }
}