'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Input } from './ui/Input';

interface User {
  id: string;
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

interface DashboardProps {
  user: User | null;
  onUserCreated: (user: User) => void;
  onSessionStart: (session: Session) => void;
}

export function Dashboard({ user, onUserCreated, onSessionStart }: DashboardProps) {
  const [showUserForm, setShowUserForm] = useState(false);
  const [formData, setFormData] = useState({
    primaryLanguage: '',
    educationLevel: '',
    purpose: '',
    readingHabit: '',
    preferredContentType: ''
  });
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    wordsLearned: 0,
    streakDays: 0,
    totalSessions: 0,
    accuracy: 0
  });

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        // Load recent sessions
        const sessionsResponse = await fetch(`/api/sessions?userId=${user!.id}&limit=5`);
        const sessionsData = await sessionsResponse.json();
        
        if (sessionsData.sessions) {
          setRecentSessions(sessionsData.sessions);
        }

        // Calculate basic stats
        const wordsLearned = Math.floor(Math.random() * 150) + 50; // Mock data
        const streakDays = Math.floor(Math.random() * 10) + 1; // Mock data
        const totalSessions = sessionsData.sessions?.length || 0;
        const accuracy = totalSessions > 0 ? Math.round(Math.random() * 30 + 70) : 0; // Mock accuracy

        setStats({ wordsLearned, streakDays, totalSessions, accuracy });
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    if (user) {
      loadUserStats();
    }
  }, [user]);

  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        onUserCreated(data.user);
        setShowUserForm(false);
      } else {
        console.error('Failed to create user:', data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const startSession = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      if (response.ok) {
        onSessionStart(data.session);
      } else {
        console.error('Failed to start session:', data.error);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const getCEFRLevel = (score: number) => {
    if (score >= 90) return 'C2 (Mastery)';
    if (score >= 75) return 'C1 (Advanced)';
    if (score >= 60) return 'B2 (Upper-Intermediate)';
    if (score >= 45) return 'B1 (Intermediate)';
    if (score >= 30) return 'A2 (Elementary)';
    return 'A1 (Beginner)';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user || showUserForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {user ? 'Update Your Profile' : 'Welcome! Let\'s Get Started'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createUser(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Primary Language"
                  placeholder="English"
                  value={formData.primaryLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryLanguage: e.target.value }))}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education Level
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.educationLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, educationLevel: e.target.value }))}
                    required
                  >
                    <option value="">Select Level</option>
                    <option value="elementary">Elementary School</option>
                    <option value="high_school">High School</option>
                    <option value="college">College/University</option>
                    <option value="graduate">Graduate School</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Learning Purpose
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    required
                  >
                    <option value="">Select Purpose</option>
                    <option value="school">School/Studies</option>
                    <option value="exams">Exam Preparation</option>
                    <option value="career">Career Development</option>
                    <option value="general_improvement">General Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reading Habit
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.readingHabit}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingHabit: e.target.value }))}
                    required
                  >
                    <option value="">Select Frequency</option>
                    <option value="rare">Rarely read</option>
                    <option value="sometimes">Sometimes read</option>
                    <option value="frequent">Frequently read</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Content Type
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.preferredContentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredContentType: e.target.value }))}
                    required
                  >
                    <option value="">Select Preference</option>
                    <option value="examples">Examples-based</option>
                    <option value="stories">Story-based</option>
                    <option value="quizzes">Quiz-focused</option>
                    <option value="mixed">Mixed approach</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                {user && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowUserForm(false)}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" size="lg">
                  {user ? 'Update Profile' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-700">Continue your vocabulary learning journey</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowUserForm(true)}
        >
          Edit Profile
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.wordsLearned}</div>
            <div className="text-sm text-gray-700">Words Learned</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.streakDays}</div>
            <div className="text-sm text-gray-700">Day Streak</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.totalSessions}</div>
            <div className="text-sm text-gray-700">Sessions Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center">
            <div className={`text-3xl font-bold ${getProgressColor(stats.accuracy)}`}>
              {stats.accuracy}%
            </div>
            <div className="text-sm text-gray-700">Average Accuracy</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Level Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {user.vocabularyLevelScore}/100
              </div>
              <div className="text-lg text-gray-900">
                {getCEFRLevel(user.vocabularyLevelScore)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to next level</span>
                <span>{user.vocabularyLevelScore % 15}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(user.vocabularyLevelScore % 15) * (100/15)}%` }}
                />
              </div>
            </div>

            {user.weakAreas.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Focus Areas:</h4>
                <div className="flex flex-wrap gap-2">
                  {user.weakAreas.map((area, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium"
                    >
                      {area.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={startSession}
              className="w-full"
              size="lg"
            >
              Start Learning Session
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
            >
              Take Assessment
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
            >
              Review Weak Words
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
            >
              View Progress
            </Button>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <p>No sessions yet</p>
                <p className="text-sm">Start your first session to see progress here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        Session {session.id.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(session.startedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {session.correctAnswers}/{session.totalWords}
                      </div>
                      <div className="text-xs text-gray-600">
                        {session.isCompleted ? 'Completed' : 'In Progress'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">
                Study Consistency
              </div>
              <div className="text-3xl font-bold text-green-600">
                {user.retentionRiskIndex < 0.3 ? 'Excellent' : 
                 user.retentionRiskIndex < 0.6 ? 'Good' : 'Needs Work'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Retention Risk: {Math.round(user.retentionRiskIndex * 100)}%
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">
                Confidence Level
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(user.confidenceScore * 100)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Based on assessment results
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">
                Next Review
              </div>
              <div className="text-3xl font-bold text-purple-600">2</div>
              <div className="text-sm text-gray-600 mt-1">
                Words ready for review
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}