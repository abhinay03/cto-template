// Onboarding system with adaptive testing
import { 
  OnboardingTest, OnboardingQuestion, OnboardingAnswer, 
  WeakArea, CEFRLevel 
} from '../types';
import { db } from './database';

interface TestResult {
  vocabularyLevelScore: number;
  weakAreas: WeakArea[];
  confidenceScore: number;
  retentionRiskIndex: number;
}

class OnboardingEngine {
  private questions: OnboardingQuestion[] = [];

  constructor() {
    this.initializeQuestions();
  }

  private initializeQuestions(): void {
    // Word recognition questions
    this.questions.push(
      {
        id: 'qr1',
        type: 'word_recognition',
        question: 'Do you know the word "benevolent"?',
        difficulty: 3,
        options: [
          { id: 'a1', text: 'Know it well', isCorrect: true, explanation: 'You recognize this word and understand its meaning' },
          { id: 'a2', text: 'Heard it before', isCorrect: false, explanation: 'You might recognize it but not fully understand' },
          { id: 'a3', text: 'Don\'t know', isCorrect: false, explanation: 'This word is new to you' }
        ],
        correctAnswer: 'a1',
        weakArea: 'adjectives'
      },
      {
        id: 'qr2',
        type: 'word_recognition',
        question: 'Do you know the word "ephemeral"?',
        difficulty: 4,
        options: [
          { id: 'b1', text: 'Know it well', isCorrect: true, explanation: 'You recognize this advanced word' },
          { id: 'b2', text: 'Heard it before', isCorrect: false },
          { id: 'b3', text: 'Don\'t know', isCorrect: false }
        ],
        correctAnswer: 'b1',
        weakArea: 'adjectives'
      },
      {
        id: 'qr3',
        type: 'word_recognition',
        question: 'Do you know the word "trivial"?',
        difficulty: 2,
        options: [
          { id: 'c1', text: 'Know it well', isCorrect: true },
          { id: 'c2', text: 'Heard it before', isCorrect: false },
          { id: 'c3', text: 'Don\'t know', isCorrect: false }
        ],
        correctAnswer: 'c1',
        weakArea: 'adjectives'
      }
    );

    // Meaning matching questions
    this.questions.push(
      {
        id: 'mm1',
        type: 'meaning_match',
        question: 'What does "meticulous" mean?',
        difficulty: 3,
        options: [
          { id: 'd1', text: 'Very careful and precise', isCorrect: true, explanation: 'Meticulous means showing great attention to detail' },
          { id: 'd2', text: 'Quick and efficient', isCorrect: false },
          { id: 'd3', text: 'Simple and easy', isCorrect: false }
        ],
        correctAnswer: 'd1',
        weakArea: 'adjectives'
      },
      {
        id: 'mm2',
        type: 'meaning_match',
        question: 'What does "ambiguous" mean?',
        difficulty: 3,
        options: [
          { id: 'e1', text: 'Having multiple possible meanings', isCorrect: true },
          { id: 'e2', text: 'Very important', isCorrect: false },
          { id: 'e3', text: 'Extremely large', isCorrect: false }
        ],
        correctAnswer: 'e1',
        weakArea: 'adjectives'
      }
    );

    // Contextual usage questions
    this.questions.push(
      {
        id: 'cu1',
        type: 'contextual_usage',
        question: 'Choose the word that best completes the sentence: "The _____ professor delivered an inspiring lecture."',
        difficulty: 2,
        options: [
          { id: 'f1', text: 'eloquent', isCorrect: true, explanation: 'Eloquent means fluent and persuasive in speaking' },
          { id: 'f2', text: 'eloquent', isCorrect: true },
          { id: 'f3', text: 'ignorant', isCorrect: false }
        ],
        correctAnswer: 'f1',
        weakArea: 'adjectives'
      },
      {
        id: 'cu2',
        type: 'contextual_usage',
        question: 'Choose the word that best completes the sentence: "She managed to _____ the complex problem with ease."',
        difficulty: 3,
        options: [
          { id: 'g1', text: 'decipher', isCorrect: true, explanation: 'Decipher means to convert into readable form or understand' },
          { id: 'g2', text: 'ignore', isCorrect: false },
          { id: 'g3', text: 'complicate', isCorrect: false }
        ],
        correctAnswer: 'g1',
        weakArea: 'verbs'
      }
    );
  }

  async startOnboardingTest(userId: string): Promise<OnboardingTest> {
    // Check if user already has an ongoing test
    const existingTest = await db.getOnboardingTest(userId);
    if (existingTest && !existingTest.isCompleted) {
      return existingTest;
    }

    // Create new onboarding test
    const test: Omit<OnboardingTest, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      currentQuestionIndex: 0,
      answers: [],
      isCompleted: false,
      vocabularyLevelScore: 0,
      weakAreas: [],
      confidenceScore: 0
    };

    return await db.createOnboardingTest(test);
  }

  async getNextQuestion(testId: string): Promise<OnboardingQuestion | null> {
    const test = this.onboardingTests.get(testId);
    if (!test || test.isCompleted) return null;

    const currentIndex = test.currentQuestionIndex;
    if (currentIndex >= this.questions.length) return null;

    // Adaptive difficulty adjustment based on previous answers
    if (currentIndex > 0) {
      const recentAnswers = test.answers.slice(-3);
      const correctRate = recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length;
      
      if (correctRate < 0.3) {
        // User struggling, adjust to easier questions
        const easierQuestion = this.questions.find(q => q.difficulty <= 2 && !test.answers.find(a => a.questionId === q.id));
        if (easierQuestion) return easierQuestion;
      } else if (correctRate > 0.8) {
        // User doing well, try harder questions
        const harderQuestion = this.questions.find(q => q.difficulty >= 4 && !test.answers.find(a => a.questionId === q.id));
        if (harderQuestion) return harderQuestion;
      }
    }

    return this.questions[currentIndex];
  }

  async submitAnswer(testId: string, answer: Omit<OnboardingAnswer, 'timestamp'>): Promise<boolean> {
    const test = this.onboardingTests.get(testId);
    if (!test || test.isCompleted) return false;

    const question = this.questions.find(q => q.id === answer.questionId);
    if (!question) return false;

    const fullAnswer: OnboardingAnswer = {
      ...answer,
      timestamp: new Date()
    };

    test.answers.push(fullAnswer);
    test.currentQuestionIndex++;

    // Update test
    await db.updateOnboardingTest(testId, {
      answers: test.answers,
      currentQuestionIndex: test.currentQuestionIndex
    });

    return true;
  }

  async completeOnboarding(testId: string): Promise<TestResult> {
    const test = this.onboardingTests.get(testId);
    if (!test) throw new Error('Test not found');

    // Calculate results
    const totalQuestions = test.answers.length;
    const correctAnswers = test.answers.filter(a => a.isCorrect).length;
    const averageTime = test.answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalQuestions;
    const averageConfidence = test.answers.reduce((sum, a) => sum + a.confidence, 0) / totalQuestions;

    // Calculate vocabulary level score (0-100)
    const baseScore = (correctAnswers / totalQuestions) * 60;
    const difficultyBonus = this.calculateDifficultyBonus(test.answers, this.questions);
    const vocabularyLevelScore = Math.min(100, Math.round(baseScore + difficultyBonus));

    // Identify weak areas
    const weakAreas = this.identifyWeakAreas(test.answers, this.questions);

    // Calculate confidence score (0-1)
    const confidenceScore = averageConfidence / 100;

    // Calculate retention risk index (0-1, higher = more risk)
    const errorRate = 1 - (correctAnswers / totalQuestions);
    const timePenalty = Math.max(0, (averageTime - 30) / 60); // Penalty for taking too long
    const retentionRiskIndex = Math.min(1, errorRate + timePenalty * 0.3);

    // Update test as completed
    await db.updateOnboardingTest(testId, {
      isCompleted: true,
      vocabularyLevelScore,
      weakAreas,
      confidenceScore
    });

    return {
      vocabularyLevelScore,
      weakAreas,
      confidenceScore,
      retentionRiskIndex
    };
  }

  private calculateDifficultyBonus(answers: OnboardingQuestion[], questions: OnboardingQuestion[]): number {
    let bonus = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && answer.isCorrect) {
        bonus += question.difficulty * 2; // Higher difficulty questions give more bonus
      }
    });
    return Math.min(40, bonus); // Cap at 40 points
  }

  private identifyWeakAreas(answers: OnboardingAnswer[], questions: OnboardingQuestion[]): WeakArea[] {
    const weakAreaStats: { [key in WeakArea]?: { correct: number; total: number } } = {};

    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        const area = question.weakArea;
        if (!weakAreaStats[area]) {
          weakAreaStats[area] = { correct: 0, total: 0 };
        }
        weakAreaStats[area]!.total++;
        if (answer.isCorrect) {
          weakAreaStats[area]!.correct++;
        }
      }
    });

    // Identify areas with less than 60% correct rate
    const weakAreas: WeakArea[] = [];
    Object.entries(weakAreaStats).forEach(([area, stats]) => {
      if (stats && stats.total >= 2 && (stats.correct / stats.total) < 0.6) {
        weakAreas.push(area as WeakArea);
      }
    });

    return weakAreas;
  }

  // Helper method to map score to CEFR level
  getCEFRLevel(score: number): CEFRLevel {
    if (score >= 90) return 'C2';
    if (score >= 75) return 'C1';
    if (score >= 60) return 'B2';
    if (score >= 45) return 'B1';
    if (score >= 30) return 'A2';
    return 'A1';
  }

  private onboardingTests = new Map<string, OnboardingTest>();
}

export const onboardingEngine = new OnboardingEngine();