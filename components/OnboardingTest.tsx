'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  userId: string;
  onComplete: (results: { vocabularyLevelScore: number; weakAreas: string[]; confidenceScore: number; retentionRiskIndex: number }) => void;
}

interface TestState {
  id: string;
  currentQuestionIndex: number;
  answers: Array<{
    questionId: string;
    selectedOptionId: string;
    timeSpent: number;
    confidence: number;
    isCorrect: boolean;
  }>;
  isCompleted: boolean;
  vocabularyLevelScore: number;
  weakAreas: string[];
  confidenceScore: number;
}

export function OnboardingTest({ userId, onComplete }: OnboardingTestProps) {
  const [test, setTest] = useState<TestState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<OnboardingQuestion | null>(null);
  const [answers, setAnswers] = useState<Array<{
    questionId: string;
    selectedOptionId: string;
    timeSpent: number;
    confidence: number;
    isCorrect: boolean;
  }>>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
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
        body: JSON.stringify({
          userId,
          action: 'start'
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTest(data.test);
        setCurrentQuestion(data.nextQuestion);
      } else {
        console.error('Failed to start onboarding:', data.error);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (testStarted) {
      startOnboarding();
    }
  }, [testStarted, startOnboarding]);

  const submitAnswer = async () => {
    if (!selectedOption || !currentQuestion) return;

    setIsSubmitting(true);
    try {
      const answer = {
        questionId: currentQuestion.id,
        selectedOptionId: selectedOption,
        timeSpent: Math.floor(Math.random() * 30) + 10, // Simulated time
        confidence: Math.floor(Math.random() * 40) + 60, // Simulated confidence
        isCorrect: currentQuestion.options.find(opt => opt.id === selectedOption)?.isCorrect || false
      };

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'submit',
          testId: test.id,
          answer
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnswers(prev => [...prev, answer]);
        
        if (data.isCompleted) {
          // Test completed
          onComplete(data.results);
        } else if (data.nextQuestion) {
          setCurrentQuestion(data.nextQuestion);
          setSelectedOption('');
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
      <span key={i} className={`text-sm ${i < difficulty ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const getWeakAreaColor = (area: string) => {
    const colors: { [key: string]: string } = {
      'adjectives': 'bg-blue-100 text-blue-800',
      'verbs': 'bg-green-100 text-green-800',
      'nouns': 'bg-purple-100 text-purple-800',
      'adverbs': 'bg-orange-100 text-orange-800'
    };
    return colors[area] || 'bg-gray-100 text-gray-800';
  };

  if (!testStarted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Vocabulary Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <p className="text-gray-600">
                We'll assess your vocabulary level through a series of questions. 
                This will help us personalize your learning experience.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What to expect:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 10-15 questions about vocabulary recognition and meaning</li>
                  <li>• Questions will adapt to your skill level</li>
                  <li>• Takes about 5-10 minutes to complete</li>
                  <li>• Be honest about your knowledge - it helps us help you better</li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={() => setTestStarted(true)}
              size="lg"
              className="w-full sm:w-auto"
            >
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
            <p className="mt-4 text-gray-600">Preparing your assessment...</p>
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
            <span className="text-sm text-gray-500">
              Question {answers.length + 1}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Difficulty:</span>
              {getDifficultyStars(currentQuestion.difficulty)}
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWeakAreaColor(currentQuestion.weakArea)}`}>
              {currentQuestion.weakArea.replace('_', ' ')}
            </span>
          </div>
          <CardTitle className="text-center text-xl">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
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
          
          <div className="mt-6 flex justify-center">
            <Button
              onClick={submitAnswer}
              disabled={!selectedOption || isSubmitting}
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Next Question'}
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
          <p className="mt-4 text-gray-600">Loading question...</p>
        </div>
      </CardContent>
    </Card>
  );
}