'use client';

import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { OnboardingTest } from '../components/OnboardingTest';
import { LearningSession } from '../components/LearningSession';

interface User {
  id: string;
  vocabularyLevelScore: number;
  weakAreas: string[];
  confidenceScore: number;
  retentionRiskIndex: number;
}

interface Session {
  id: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage or create a demo user
    checkExistingUser();
  }, []);

  const checkExistingUser = () => {
    try {
      const storedUser = localStorage.getItem('vocab_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('vocab_user', JSON.stringify(user));
    
    // Check if user needs onboarding
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
    // Update user with onboarding results
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      vocabularyLevelScore: results.vocabularyLevelScore,
      weakAreas: results.weakAreas,
      confidenceScore: results.confidenceScore,
      retentionRiskIndex: results.retentionRiskIndex
    };
    
    setCurrentUser(updatedUser);
    localStorage.setItem('vocab_user', JSON.stringify(updatedUser));
    setShowOnboarding(false);
  };

  const handleSessionStart = (session: Session) => {
    setCurrentSession(session);
  };

  const handleSessionComplete = () => {
    setCurrentSession(null);
    // Refresh user data to reflect session completion
    // In a real app, you'd fetch updated user data from API
  };

  const handleExitSession = () => {
    setCurrentSession(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-50 py-8">
        <OnboardingTest 
          userId={currentUser?.id} 
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  if (currentSession) {
    return (
      <div className="min-h-screen bg-zinc-50 py-8">
        <LearningSession
          userId={currentUser?.id}
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
        onUserCreated={handleUserCreated}
        onSessionStart={handleSessionStart}
      />
    </div>
  );
}
