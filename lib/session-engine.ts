// Daily Session Management Engine
import { 
  CEFRLevel,
  DailySession, SessionWord, SessionAttempt, 
  ActivityType, Priority, WordState, WeakArea, UserWord, Word, LearningAnalytics
} from '../types';
import { db } from './database';
import { srsEngine } from './spaced-repetition-engine';

interface SessionConfiguration {
  newWordsPercentage: number;
  weakWordsPercentage: number;
  revisionPercentage: number;
  challengePercentage: number;
  totalWords: number;
  sessionDuration: number; // minutes
}

class SessionEngine {
  private readonly DEFAULT_CONFIG: SessionConfiguration = {
    newWordsPercentage: 30,
    weakWordsPercentage: 40,
    revisionPercentage: 20,
    challengePercentage: 10,
    totalWords: 15,
    sessionDuration: 15
  };

  /**
   * Create a personalized daily learning session
   */
  async createDailySession(userId: string, customConfig?: Partial<SessionConfiguration>): Promise<DailySession> {
    const config = { ...this.DEFAULT_CONFIG, ...customConfig };
    
    // Get user analytics to inform session creation
    const analytics = await db.getUserAnalytics(userId);
    const user = await db.getUser(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate dynamic session size based on user performance
    const adjustedConfig = this.adjustSessionConfiguration(config, analytics);

    // Create session words based on user progress
    const sessionWords = await this.createSessionWords(userId, adjustedConfig);

    const sessionData: Omit<DailySession, 'id'> = {
      userId,
      sessionType: 'mixed',
      words: sessionWords,
      completedWords: [],
      totalWords: sessionWords.length,
      correctAnswers: 0,
      sessionDuration: adjustedConfig.sessionDuration * 60, // Convert to seconds
      startedAt: new Date(),
      isCompleted: false
    };

    return await db.createDailySession(sessionData);
  }

  /**
   * Process a session attempt and update progress
   */
  async processSessionAttempt(
    sessionId: string, 
    userWordId: string, 
    attempt: Omit<SessionAttempt, 'timestamp'>
  ): Promise<{ 
    isCorrect: boolean; 
    nextActivity?: {
      activityType: ActivityType;
      difficulty: number;
      hints: string[];
      nextReviewInterval: number;
    }; 
    sessionUpdate: DailySession;
  }> {
    const session = await db.getDailySession(sessionId);
    if (!session) throw new Error('Session not found');

    const sessionWord = session.words.find(sw => sw.userWordId === userWordId);
    if (!sessionWord) throw new Error('Session word not found');

    // Add attempt to session word
    sessionWord.attempts.push({
      ...attempt,
      timestamp: new Date()
    });

    // Update user word in database using SRS engine
    await srsEngine.scheduleNextReview(userWordId, sessionWord.attempts);

    // Update session progress
    if (attempt.isCorrect) {
      session.correctAnswers++;
    }
    
    session.completedWords.push(userWordId);
    sessionWord.isCompleted = true;

    // Check if session is complete
    const isComplete = session.completedWords.length >= session.totalWords;
    if (isComplete) {
      session.completedAt = new Date();
      session.isCompleted = true;
      
      // Update user analytics after session completion
      await this.updateUserAnalyticsAfterSession(session);
    }

    // Update session in database
    const updatedSession = await db.updateDailySession(sessionId, {
      words: session.words,
      completedWords: session.completedWords,
      correctAnswers: session.correctAnswers,
      completedAt: session.completedAt,
      isCompleted: session.isCompleted
    }) as DailySession;

    return {
      isCorrect: attempt.isCorrect,
      nextActivity: await this.getNextActivity(userWordId, attempt.isCorrect),
      sessionUpdate: updatedSession
    };
  }

  /**
   * Get intelligent activity suggestions for the next learning activity
   */
  async getNextActivity(userWordId: string, wasCorrect: boolean): Promise<{
    activityType: ActivityType;
    difficulty: number;
    hints: string[];
    nextReviewInterval: number;
  }> {
    const userWord = await db.getUserWordById(userWordId);
    if (!userWord) throw new Error('User word not found');

    const word = await db.getWord(userWord.wordId);
    if (!word) throw new Error('Word not found');

    // Determine activity type based on performance and word state
    let activityType: ActivityType;
    const difficulty = this.cefrToDifficulty(word.difficultyLevel);
    let hints: string[] = [];

    if (!wasCorrect) {
      // For incorrect answers, use more supportive activities
      activityType = word.partOfSpeech === 'noun' ? 'image_association' : 'flashcard';
      hints = this.generateHints(word, userWord.wordState);
    } else {
      // For correct answers, progress to more challenging activities
      if (userWord.wordState === 'new' || userWord.wordState === 'learning') {
        activityType = 'mcq';
      } else if (userWord.wordState === 'known') {
        activityType = 'sentence_building';
      } else {
        activityType = 'story_usage';
      }
    }

    // Calculate next review interval
    const nextReviewInterval = this.calculateNextReviewInterval(userWord.familiarityScore, wasCorrect);

    return {
      activityType,
      difficulty,
      hints,
      nextReviewInterval
    };
  }

  /**
   * Get session analytics and insights
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    accuracy: number;
    averageTimePerWord: number;
    weakAreasIdentified: WeakArea[];
    improvementAreas: string[];
    recommendations: string[];
  }> {
    const session = await db.getDailySession(sessionId);
    if (!session) throw new Error('Session not found');

    const completedWords = session.words.filter(sw => sw.isCompleted);
    const accuracy = completedWords.length > 0 ? session.correctAnswers / completedWords.length : 0;
    
    const totalTime = completedWords.reduce((sum, sw) => 
      sum + sw.attempts.reduce((attemptSum, attempt) => attemptSum + attempt.timeSpent, 0), 0
    );
    const averageTimePerWord = completedWords.length > 0 ? totalTime / completedWords.length : 0;

    // Identify weak areas based on incorrect answers
    const weakAreas = await this.identifyWeakAreasFromSession(completedWords);

    // Generate improvement recommendations
    const recommendations = this.generateRecommendations(accuracy, averageTimePerWord, weakAreas);

    return {
      accuracy,
      averageTimePerWord,
      weakAreasIdentified: weakAreas,
      improvementAreas: this.getImprovementAreas(completedWords),
      recommendations
    };
  }

  private async createSessionWords(
    userId: string,
    config: SessionConfiguration
  ): Promise<SessionWord[]> {
    // Get words for each category
    const newWords = await this.selectNewWords(userId, Math.ceil(config.totalWords * config.newWordsPercentage / 100));
    const weakWords = await this.selectWeakWords(userId, Math.ceil(config.totalWords * config.weakWordsPercentage / 100));
    const revisionWords = await this.selectRevisionWords(userId, Math.ceil(config.totalWords * config.revisionPercentage / 100));
    const challengeWords = await this.selectChallengeWords(userId, Math.ceil(config.totalWords * config.challengePercentage / 100));

    const combined = [...newWords, ...weakWords, ...revisionWords, ...challengeWords];

    const byUserWordId = new Map<string, UserWord>();
    for (const userWord of combined) {
      byUserWordId.set(userWord.id, userWord);
    }

    // If we didn't have enough content, backfill with additional new words
    if (byUserWordId.size < config.totalWords) {
      const remaining = config.totalWords - byUserWordId.size;
      const backfill = await this.selectNewWords(userId, remaining);
      for (const userWord of backfill) {
        byUserWordId.set(userWord.id, userWord);
      }
    }

    const priorityRank: Record<Priority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    const sessionWords = Array.from(byUserWordId.values()).map((userWord): SessionWord => {
      const activityType = this.determineActivityType(userWord.wordState);
      const priority = this.calculateWordPriority(userWord);

      return {
        userWordId: userWord.id,
        wordId: userWord.wordId,
        activityType,
        priority,
        isCompleted: false,
        attempts: []
      };
    });

    return sessionWords
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
      .slice(0, config.totalWords);
  }

  private adjustSessionConfiguration(
    config: SessionConfiguration,
    analytics: LearningAnalytics | null
  ): SessionConfiguration {
    const adjusted = { ...config };

    const retentionRate = analytics?.retentionRate ?? 0;
    const averageTimePerWord = analytics?.averageTimePerWord ?? 0;

    // Adjust based on retention rate
    if (retentionRate < 0.6) {
      // User struggling, increase revision percentage
      adjusted.revisionPercentage = Math.min(50, adjusted.revisionPercentage + 10);
      adjusted.newWordsPercentage = Math.max(20, adjusted.newWordsPercentage - 10);
    } else if (retentionRate > 0.8) {
      // User doing well, increase challenge percentage
      adjusted.challengePercentage = Math.min(25, adjusted.challengePercentage + 5);
    }

    // Adjust session length based on user performance
    if (averageTimePerWord > 30) {
      // User taking too long per word, reduce session size
      adjusted.totalWords = Math.max(10, adjusted.totalWords - 3);
    }

    return adjusted;
  }

  private async selectNewWords(userId: string, count: number): Promise<UserWord[]> {
    if (count <= 0) return [];

    const user = await db.getUser(userId);
    if (!user) return [];

    const existingUserWords = await db.getUserWords(userId);

    const existingNewWords = existingUserWords
      .filter(uw => uw.wordState === 'new')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, count);

    const remainingToCreate = count - existingNewWords.length;
    if (remainingToCreate <= 0) return existingNewWords;

    const learnedWordIds = new Set(existingUserWords.map(uw => uw.wordId));

    const targetLevel = this.scoreToCEFR(user.vocabularyLevelScore);
    const levelBand = this.getLevelBand(targetLevel);

    const posBoost = (word: Word): number => {
      if (user.weakAreas.includes('verbs') && word.partOfSpeech === 'verb') return 3;
      if (user.weakAreas.includes('adjectives') && word.partOfSpeech === 'adjective') return 3;
      if (user.weakAreas.includes('nouns') && word.partOfSpeech === 'noun') return 3;
      if (user.weakAreas.includes('adverbs') && word.partOfSpeech === 'adverb') return 3;
      return 0;
    };

    const candidates = (await db.getAllWords())
      .filter(w => levelBand.includes(w.difficultyLevel) && !learnedWordIds.has(w.id))
      .sort((a, b) => (posBoost(b) - posBoost(a)) || (b.frequencyScore - a.frequencyScore));

    const selected = candidates.slice(0, remainingToCreate);

    const created: UserWord[] = [];
    for (const word of selected) {
      created.push(await srsEngine.initializeNewWord(userId, word.id));
    }

    return [...existingNewWords, ...created];
  }

  private async selectWeakWords(userId: string, count: number): Promise<UserWord[]> {
    if (count <= 0) return [];

    const weakWords = await db.getWordsByState(userId, 'weak');
    return weakWords
      .sort((a, b) => a.nextRevisionDate.getTime() - b.nextRevisionDate.getTime() || a.confidenceRating - b.confidenceRating)
      .slice(0, count);
  }

  private async selectRevisionWords(userId: string, count: number): Promise<UserWord[]> {
    if (count <= 0) return [];
    return await db.getWordsForRevision(userId, count);
  }

  private async selectChallengeWords(userId: string, count: number): Promise<UserWord[]> {
    if (count <= 0) return [];

    const userWords = await db.getUserWords(userId);

    return userWords
      .filter(uw => uw.wordState === 'known' || uw.wordState === 'mastered')
      .sort((a, b) => b.familiarityScore - a.familiarityScore)
      .slice(0, count);
  }

  private scoreToCEFR(score: number): CEFRLevel {
    if (score >= 90) return 'C2';
    if (score >= 75) return 'C1';
    if (score >= 60) return 'B2';
    if (score >= 45) return 'B1';
    if (score >= 30) return 'A2';
    return 'A1';
  }

  private getLevelBand(level: CEFRLevel): CEFRLevel[] {
    const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const idx = order.indexOf(level);
    const lower = order[Math.max(0, idx - 1)];
    const upper = order[Math.min(order.length - 1, idx + 1)];

    return Array.from(new Set([lower, level, upper]));
  }

  private determineActivityType(wordState: WordState): ActivityType {
    const activityMap: { [key in WordState]: ActivityType } = {
      'new': 'flashcard',
      'learning': 'mcq',
      'weak': 'flashcard',
      'known': 'sentence_building',
      'mastered': 'story_usage',
      'at_risk': 'mcq'
    };

    return activityMap[wordState] || 'flashcard';
  }

  private calculateWordPriority(userWord: UserWord): Priority {
    if (userWord.wordState === 'weak') return 'critical';
    if (userWord.wordState === 'at_risk') return 'high';
    if (userWord.confidenceRating <= 2) return 'high';
    if (userWord.revisionCount < 2) return 'medium';
    return 'low';
  }

  private generateHints(word: Word, wordState: WordState): string[] {
    const hints: string[] = [];

    // Add hints based on part of speech
    if (word.partOfSpeech === 'verb') {
      hints.push(`This is a ${word.partOfSpeech} - it describes an action or state`);
    } else if (word.partOfSpeech === 'adjective') {
      hints.push(`This is a ${word.partOfSpeech} - it describes a quality or characteristic`);
    }

    // Add hints based on word state
    if (wordState === 'weak' || wordState === 'at_risk') {
      hints.push('Take your time to think about the context');
      hints.push('Remember to consider the surrounding words for clues');
    }

    return hints;
  }

  private calculateNextReviewInterval(familiarityScore: number, wasCorrect: boolean): number {
    const baseInterval = wasCorrect ? 3 : 1; // days
    const familiarityMultiplier = Math.max(0.5, familiarityScore);
    return Math.ceil(baseInterval * familiarityMultiplier);
  }

  private cefrToDifficulty(level: CEFRLevel): number {
    const map: Record<CEFRLevel, number> = {
      A1: 1,
      A2: 2,
      B1: 3,
      B2: 4,
      C1: 5,
      C2: 5
    };

    return map[level];
  }

  private async identifyWeakAreasFromSession(completedWords: SessionWord[]): Promise<WeakArea[]> {
    const weakAreaMap: { [key in WeakArea]?: number } = {};
    let totalErrors = 0;

    completedWords.forEach(sw => {
      sw.attempts.forEach(attempt => {
        if (!attempt.isCorrect) {
          totalErrors++;
          // In a real implementation, you'd map the word to its weak area
          // For now, we'll use a simplified approach
        }
      });
    });

    // Return weak areas with high error rates
    return Object.entries(weakAreaMap)
      .filter(([, errorCount]) => errorCount && (errorCount / totalErrors) > 0.3)
      .map(([area]) => area as WeakArea);
  }

  private generateRecommendations(accuracy: number, avgTime: number, weakAreas: WeakArea[]): string[] {
    const recommendations: string[] = [];

    if (accuracy < 0.6) {
      recommendations.push('Focus on reviewing foundational vocabulary before moving to advanced words');
      recommendations.push('Consider spending more time with each word to ensure better retention');
    } else if (accuracy > 0.8) {
      recommendations.push('Great job! You\'re ready for more challenging vocabulary');
    }

    if (avgTime > 30) {
      recommendations.push('Try to spend less time per word - aim for 15-20 seconds for recognition');
    } else if (avgTime < 10) {
      recommendations.push('Consider spending more time to ensure deeper understanding');
    }

    if (weakAreas.length > 0) {
      recommendations.push(`Focus extra practice on: ${weakAreas.join(', ')}`);
    }

    return recommendations;
  }

  private getImprovementAreas(completedWords: SessionWord[]): string[] {
    const areas: string[] = [];
    const errorCount = completedWords.reduce((sum, sw) => 
      sum + sw.attempts.filter(a => !a.isCorrect).length, 0
    );

    if (errorCount > completedWords.length * 0.3) {
      areas.push('Vocabulary foundation');
      areas.push('Word recognition speed');
    }

    return areas;
  }

  private async updateUserAnalyticsAfterSession(session: DailySession): Promise<void> {
    const analytics = await db.getUserAnalytics(session.userId) || {
      userId: session.userId,
      retentionRate: 0,
      forgettingCurve: 0,
      averageTimePerWord: 0,
      errorPatterns: [],
      learningVelocity: 0,
      weakAreaProgression: {},
      streakDays: 0,
      lastSessionDate: new Date()
    };

    const accuracy = session.correctAnswers / session.totalWords;
    const completedWords = session.words.filter(sw => sw.isCompleted);
    const avgTime = completedWords.length > 0 ? 
      completedWords.reduce((sum, sw) => 
        sum + sw.attempts.reduce((attemptSum, attempt) => attemptSum + attempt.timeSpent, 0), 0
      ) / completedWords.length : 0;

    await db.updateUserAnalytics(session.userId, {
      retentionRate: (analytics.retentionRate + accuracy) / 2, // Moving average
      averageTimePerWord: (analytics.averageTimePerWord + avgTime) / 2,
      lastSessionDate: new Date(),
      learningVelocity: completedWords.length / (session.sessionDuration / 60) // words per minute
    });
  }
}

export const sessionEngine = new SessionEngine();