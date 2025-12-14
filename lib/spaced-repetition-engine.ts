// Spaced Repetition System (SRS) based on SM-2 algorithm
import { ErrorRecord, ErrorType, UserWord, SessionAttempt, WordState } from '../types';
import { db } from './database';

interface SRSData {
  easeFactor: number;
  interval: number;
  repetition: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
  successRate: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
}

class SpacedRepetitionEngine {
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly MAX_EASE_FACTOR = 2.5;
  private readonly DEFAULT_EASE_FACTOR = 2.5;
  private readonly BASE_INTERVAL = 1; // 1 day

  /**
   * Calculate next review schedule based on user performance
   */
  async scheduleNextReview(
    userWordId: string,
    attempts: SessionAttempt[]
  ): Promise<UserWord> {
    const userWord = await db.getUserWordById(userWordId);
    if (!userWord) throw new Error('User word not found');

    const latestAttempt = attempts[attempts.length - 1];
    if (!latestAttempt) throw new Error('No attempts provided');

    const srsData = this.extractSRSData(userWord);

    const updatedSRSData = this.updateSRSData(srsData, latestAttempt);

    const nextReviewDate = this.calculateNextReviewDate(updatedSRSData);

    const newState = this.determineWordState(updatedSRSData, userWord.wordState);

    const newFamiliarityScore = this.calculateFamiliarityScore(
      userWord.familiarityScore,
      latestAttempt.isCorrect,
      latestAttempt.confidence
    );

    const newConfidenceRating = Math.min(5, Math.max(1,
      userWord.confidenceRating + (latestAttempt.isCorrect ? 1 : -1)
    ));

    const nextErrorHistory = latestAttempt.isCorrect
      ? userWord.errorHistory
      : [...userWord.errorHistory, await this.createErrorRecord(userWord, latestAttempt)];

    return await db.updateUserWord(userWordId, {
      lastSeen: new Date(),
      nextRevisionDate: nextReviewDate,
      revisionCount: userWord.revisionCount + 1,
      confidenceRating: newConfidenceRating,
      familiarityScore: newFamiliarityScore,
      wordState: newState,
      errorHistory: nextErrorHistory,
      srsEaseFactor: updatedSRSData.easeFactor,
      srsInterval: updatedSRSData.interval,
      srsRepetition: updatedSRSData.repetition,
      srsConsecutiveCorrect: updatedSRSData.consecutiveCorrect,
      srsConsecutiveIncorrect: updatedSRSData.consecutiveIncorrect
    }) as UserWord;
  }

  /**
   * Get words ready for review today
   */
  async getWordsForReview(userId: string, limit: number = 20): Promise<UserWord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allUserWords = await db.getUserWords(userId);
    
    // Get words that are due for review
    const reviewWords = allUserWords.filter(uw => 
      uw.nextRevisionDate <= today && uw.wordState !== 'mastered'
    );

    // Prioritize words based on urgency and state
    const prioritizedWords = this.prioritizeWordsForReview(reviewWords);
    
    return prioritizedWords.slice(0, limit);
  }

  /**
   * Create learning schedule for a new word
   */
  async initializeNewWord(userId: string, wordId: string): Promise<UserWord> {
    const srsData: SRSData = {
      easeFactor: this.DEFAULT_EASE_FACTOR,
      interval: this.BASE_INTERVAL,
      repetition: 0,
      nextReviewDate: this.getTomorrow(),
      lastReviewDate: new Date(),
      successRate: 0,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0
    };

    const userWordData: Omit<UserWord, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      wordId,
      familiarityScore: 0,
      lastSeen: new Date(),
      nextRevisionDate: srsData.nextReviewDate,
      revisionCount: 0,
      confidenceRating: 1,
      errorHistory: [],
      wordState: 'new',
      srsEaseFactor: srsData.easeFactor,
      srsInterval: srsData.interval,
      srsRepetition: srsData.repetition,
      srsConsecutiveCorrect: srsData.consecutiveCorrect,
      srsConsecutiveIncorrect: srsData.consecutiveIncorrect
    };

    return await db.createUserWord(userWordData);
  }

  /**
   * Analyze error patterns to provide targeted practice
   */
  async analyzeErrorPatterns(userId: string): Promise<{ [key in ErrorType]?: UserWord[] }> {
    const userWords = await db.getUserWords(userId);
    const errorPatterns: { [key in ErrorType]?: UserWord[] } = {};

    userWords.forEach(userWord => {
      userWord.errorHistory.forEach(error => {
        if (!errorPatterns[error.errorType]) {
          errorPatterns[error.errorType] = [];
        }
        errorPatterns[error.errorType]!.push(userWord);
      });
    });

    return errorPatterns;
  }

  /**
   * Get intelligent word suggestions based on user's progress
   */
  async getWordSuggestions(userId: string, count: number = 5): Promise<string[]> {
    const userWords = await db.getUserWords(userId);

    const learnedWordTexts = new Set<string>();
    for (const userWord of userWords) {
      const word = await db.getWord(userWord.wordId);
      if (word) learnedWordTexts.add(word.word.toLowerCase());
    }

    const expansionCandidates = userWords.filter(uw => uw.wordState === 'known' || uw.wordState === 'mastered');
    const suggestions: string[] = [];

    for (const userWord of expansionCandidates.slice(0, 10)) {
      const word = await db.getWord(userWord.wordId);
      if (!word) continue;

      const newSynonyms = word.semanticMetadata.synonyms
        .filter(syn => !learnedWordTexts.has(syn.toLowerCase()))
        .slice(0, 2);

      suggestions.push(...newSynonyms);

      if (suggestions.length >= count) break;
    }

    return suggestions.slice(0, count);
  }

  private async createErrorRecord(userWord: UserWord, attempt: SessionAttempt): Promise<ErrorRecord> {
    const word = await db.getWord(userWord.wordId);

    const correctAnswer = word?.meanings[0]?.definition || word?.word || '';

    return {
      date: new Date(),
      errorType: 'meaning_confusion',
      context: 'daily_session',
      attemptedAnswer: attempt.userAnswer,
      correctAnswer
    };
  }

  private extractSRSData(userWord: UserWord): SRSData {
    const derivedInterval = Math.max(
      1,
      Math.ceil((userWord.nextRevisionDate.getTime() - userWord.lastSeen.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      easeFactor: userWord.srsEaseFactor ?? this.DEFAULT_EASE_FACTOR,
      interval: userWord.srsInterval ?? derivedInterval,
      repetition: userWord.srsRepetition ?? userWord.revisionCount,
      nextReviewDate: userWord.nextRevisionDate,
      lastReviewDate: userWord.lastSeen,
      successRate: userWord.familiarityScore,
      consecutiveCorrect: userWord.srsConsecutiveCorrect ?? Math.min(5, userWord.confidenceRating),
      consecutiveIncorrect: userWord.srsConsecutiveIncorrect ?? 0
    };
  }

  private updateSRSData(srsData: SRSData, attempt: SessionAttempt): SRSData {
    const updated = { ...srsData };
    
    if (attempt.isCorrect) {
      updated.consecutiveCorrect = Math.min(10, updated.consecutiveCorrect + 1);
      updated.consecutiveIncorrect = 0;
      
      // Increase ease factor slightly for correct answers
      updated.easeFactor = Math.min(this.MAX_EASE_FACTOR, updated.easeFactor + 0.1);
      
      // Increase interval based on repetition count
      if (updated.repetition === 0) {
        updated.interval = 1;
      } else if (updated.repetition === 1) {
        updated.interval = 6;
      } else {
        updated.interval = Math.round(updated.interval * updated.easeFactor);
      }
      
    } else {
      updated.consecutiveCorrect = 0;
      updated.consecutiveIncorrect++;
      
      // Decrease ease factor for incorrect answers
      updated.easeFactor = Math.max(this.MIN_EASE_FACTOR, updated.easeFactor - 0.2);
      
      // Reset interval for incorrect answers
      updated.interval = 1;
    }
    
    updated.repetition++;
    updated.lastReviewDate = new Date();
    updated.successRate = this.calculateSuccessRate(updated, attempt.isCorrect);
    
    return updated;
  }

  private calculateNextReviewDate(srsData: SRSData): Date {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + srsData.interval);
    return nextReview;
  }

  private determineWordState(srsData: SRSData, currentState: WordState): WordState {
    const { consecutiveCorrect, consecutiveIncorrect, successRate } = srsData;
    
    // State transitions based on performance
    if (consecutiveIncorrect >= 2) {
      return 'weak';
    } else if (consecutiveCorrect >= 5 && successRate > 0.8) {
      return 'mastered';
    } else if (consecutiveCorrect >= 3 && successRate > 0.6) {
      return 'known';
    } else if (consecutiveCorrect >= 1 && successRate > 0.3) {
      return 'learning';
    }
    
    return currentState;
  }

  private calculateFamiliarityScore(currentScore: number, wasCorrect: boolean, confidence: number): number {
    const weight = confidence / 100; // Normalize confidence to 0-1
    const delta = wasCorrect ? 0.1 * weight : -0.15;
    
    return Math.max(0, Math.min(1, currentScore + delta));
  }

  private prioritizeWordsForReview(words: UserWord[]): UserWord[] {
    return words.sort((a, b) => {
      // Priority factors:
      // 1. Days overdue (higher priority for more overdue)
      // 2. Current state (weak words take priority)
      // 3. Confidence rating (lower confidence = higher priority)
      // 4. Revision count (words with fewer reviews take priority)
      
      const now = new Date();
      const aOverdue = Math.max(0, Math.ceil((now.getTime() - a.nextRevisionDate.getTime()) / (1000 * 60 * 60 * 24)));
      const bOverdue = Math.max(0, Math.ceil((now.getTime() - b.nextRevisionDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const statePriority = this.getStatePriority(a.wordState) - this.getStatePriority(b.wordState);
      const confidencePriority = b.confidenceRating - a.confidenceRating; // Lower confidence = higher priority
      const revisionPriority = a.revisionCount - b.revisionCount; // Fewer revisions = higher priority
      
      // Weighted scoring
      const aScore = (aOverdue * 3) + statePriority + confidencePriority + revisionPriority;
      const bScore = (bOverdue * 3) + statePriority + confidencePriority + revisionPriority;
      
      return bScore - aScore;
    });
  }

  private getStatePriority(state: WordState): number {
    const priorityMap: { [key in WordState]: number } = {
      'weak': 10,
      'at_risk': 8,
      'new': 6,
      'learning': 4,
      'known': 2,
      'mastered': 0
    };
    return priorityMap[state] || 0;
  }

  private calculateSuccessRate(srsData: SRSData, wasCorrect: boolean): number {
    // Simple success rate calculation
    const totalReviews = srsData.repetition;
    const currentSuccess = srsData.successRate * (totalReviews - 1);
    const newSuccess = wasCorrect ? currentSuccess + 1 : currentSuccess;
    
    return totalReviews > 0 ? newSuccess / totalReviews : wasCorrect ? 1 : 0;
  }

  private getTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
}

export const srsEngine = new SpacedRepetitionEngine();