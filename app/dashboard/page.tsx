'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '../../components/Dashboard';
import { OnboardingTest } from '../../components/OnboardingTest';
import { LearningSession } from '../../components/LearningSession';

interface User {
  id: string;
  email: string;
  primaryLanguage: string;
  educationLevel: string;
  purpose: string;
  readingHabit: string;
  preferredContentType: string;
  vocabularyLevelScore: number;
  weakAreas: string[];
  confidenceScore: number;
  retentionRiskIndex: number;
}

interface Session {
  id: string;
  words: Array<{
    userWordId: string;
    wordId: string;
    activityType: string;
    priority: string;
  }>;
  totalWords: number;
  correctAnswers: number;
  startedAt: string;
  isCompleted: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!data.user) {
          router.replace('/login');
          return;
        }

        setCurrentUser(data.user);
        if (data.user.vocabularyLevelScore === 0) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [router]);

  const handleUserUpdated = (user: User) => {
    setCurrentUser(user);
    if (user.vocabularyLevelScore === 0) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = (results: {
    vocabularyLevelScore: number;
    weakAreas: string[];
    confidenceScore: number;
    retentionRiskIndex: number;
  }) => {
    if (!currentUser) return;

    setCurrentUser({
      ...currentUser,
      vocabularyLevelScore: results.vocabularyLevelScore,
      weakAreas: results.weakAreas,
      confidenceScore: results.confidenceScore,
      retentionRiskIndex: results.retentionRiskIndex
    });

    setShowOnboarding(false);
  };

  const handleSessionStart = (session: Session) => {
    setCurrentSession(session);
  };

  const handleSessionComplete = () => {
    setCurrentSession(null);
  };

  const handleExitSession = () => {
    setCurrentSession(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-50 py-8">
        <OnboardingTest onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  if (currentSession) {
    return (
      <div className="min-h-screen bg-zinc-50 py-8">
        <LearningSession
          session={currentSession}
          onComplete={handleSessionComplete}
          onExit={handleExitSession}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <Dashboard
        user={currentUser}
        onUserCreated={handleUserUpdated}
        onSessionStart={handleSessionStart}
        onStartAssessment={() => setShowOnboarding(true)}
      />
    </div>
  );
}
