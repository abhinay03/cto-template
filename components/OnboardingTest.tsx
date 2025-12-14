'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface OnboardingQuestion {
  id: string;
  type: string;
  question: string;
  difficulty: number;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  correctAnswer: string;
  weakArea: string;
}

interface OnboardingTestProps {
  onComplete: (results: {
    vocabularyLevelScore: number;
    weakAreas: string[];
    confidenceScore: number;
    retentionRiskIndex: number;
  }) => void;
}

interface TestState {
  id: string;
  currentQuestionIndex: number;
  isCompleted: boolean;
  vocabularyLevelScore: number;
  weakAreas: string[];
  confidenceScore: number;
}

export function OnboardingTest({ onComplete }: OnboardingTestProps) {
  const [test, setTest] = useState<TestState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<OnboardingQuestion | null>(null);
  const [answersCount, setAnswersCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [confidence, setConfidence] = useState(70);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const startOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await response.json();
      if (response.ok) {
        setTest(data.test);
        setCurrentQuestion(data.nextQuestion);
        setAnswersCount(0);
        setSelectedOption('');
        setConfidence(70);
        setQuestionStartedAt(0);
      } else {
        console.error('Failed to start onboarding:', data.error);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (testStarted) {
      startOnboarding();
    }
  }, [testStarted, startOnboarding]);

  useEffect(() => {
    if (!currentQuestion) return;
    setSelectedOption('');
    setConfidence(70);
    setElapsedSeconds(0);
    setQuestionStartedAt(Date.now());
  }, [currentQuestion]);

  useEffect(() => {
    if (!questionStartedAt) return;

    const intervalId = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000)));
    }, 500);

    return () => clearInterval(intervalId);
  }, [questionStartedAt]);

  const submitAnswer = async () => {
    if (!test || !selectedOption || !currentQuestion) return;

    setIsSubmitting(true);
    try {
      const timeSpent = elapsedSeconds;

      const answer = {
        questionId: currentQuestion.id,
        selectedOptionId: selectedOption,
        timeSpent,
        confidence
      };

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          testId: test.id,
          answer
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnswersCount(prev => prev + 1);

        if (data.isCompleted) {
          onComplete(data.results);
        } else if (data.nextQuestion) {
          setCurrentQuestion(data.nextQuestion);
        }
      } else {
        console.error('Failed to submit answer:', data.error);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < difficulty ? 'text-yellow-500' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const getWeakAreaColor = (area: string) => {
    const colors: { [key: string]: string } = {
      adjectives: 'bg-blue-100 text-blue-800',
      verbs: 'bg-green-100 text-green-800',
      nouns: 'bg-purple-100 text-purple-800',
      adverbs: 'bg-orange-100 text-orange-800',
      academic_vocabulary: 'bg-indigo-100 text-indigo-800',
      conversational: 'bg-teal-100 text-teal-800'
    };
    return colors[area] || 'bg-gray-100 text-gray-800';
  };

  if (!testStarted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Vocabulary Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <p className="text-gray-700">
                We&apos;ll assess your vocabulary level through a series of questions. This helps personalize your daily
                sessions.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h4 className="font-medium text-blue-900 mb-2">What to expect</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 10–12 adaptive questions</li>
                  <li>• Recognition, meaning, and context</li>
                  <li>• Takes about 5–8 minutes</li>
                </ul>
              </div>
            </div>

            <Button onClick={() => setTestStarted(true)} size="lg" className="w-full sm:w-auto">
              Start Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Preparing your assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentQuestion) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-700">Question {answersCount + 1}</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Difficulty:</span>
              {getDifficultyStars(currentQuestion.difficulty)}
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWeakAreaColor(currentQuestion.weakArea)}`}>
              {currentQuestion.weakArea.replace('_', ' ')}
            </span>
          </div>
          <CardTitle className="text-center text-xl">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.options.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedOption === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{option.text}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">How confident are you?</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={confidence}
                onChange={e => setConfidence(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <span className="w-12 text-right text-sm text-gray-700">{confidence}%</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button onClick={submitAnswer} disabled={!selectedOption || isSubmitting} size="lg">
              {isSubmitting ? 'Submitting...' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading question...</p>
        </div>
      </CardContent>
    </Card>
  );
}
