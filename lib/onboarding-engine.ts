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
          { id: 'f2', text: 'meticulous', isCorrect: false },
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
      },
      {
        id: 'cu3',
        type: 'contextual_usage',
        question: 'Choose the word that best completes the sentence: "Could I _____ your notes for a moment?"',
        difficulty: 2,
        options: [
          { id: 'h1', text: 'borrow', isCorrect: true },
          { id: 'h2', text: 'lend', isCorrect: false },
          { id: 'h3', text: 'forget', isCorrect: false }
        ],
        correctAnswer: 'h1',
        weakArea: 'verbs'
      },
      {
        id: 'mm3',
        type: 'meaning_match',
        question: 'What does "curious" mean?',
        difficulty: 2,
        options: [
          { id: 'i1', text: 'Wanting to know or learn something', isCorrect: true },
          { id: 'i2', text: 'Feeling sleepy', isCorrect: false },
          { id: 'i3', text: 'Being very angry', isCorrect: false }
        ],
        correctAnswer: 'i1',
        weakArea: 'conversational'
      },
      {
        id: 'sm1',
        type: 'synonym_match',
        question: 'Which word is closest in meaning to "happy"?',
        difficulty: 1,
        options: [
          { id: 'j1', text: 'glad', isCorrect: true },
          { id: 'j2', text: 'tired', isCorrect: false },
          { id: 'j3', text: 'angry', isCorrect: false }
        ],
        correctAnswer: 'j1',
        weakArea: 'conversational'
      },
      {
        id: 'qr4',
        type: 'word_recognition',
        question: 'Do you know the word "obfuscate"?',
        difficulty: 5,
        options: [
          { id: 'k1', text: 'Know it well', isCorrect: true },
          { id: 'k2', text: 'Heard it before', isCorrect: false },
          { id: 'k3', text: 'Don\'t know', isCorrect: false }
        ],
        correctAnswer: 'k1',
        weakArea: 'academic_vocabulary'
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

  private readonly MAX_QUESTIONS = 12;

  async getNextQuestion(testId: string): Promise<OnboardingQuestion | null> {
    const test = await db.getOnboardingTestById(testId);
    if (!test || test.isCompleted) return null;

    if (test.answers.length >= this.MAX_QUESTIONS) return null;

    const answeredIds = new Set(test.answers.map(a => a.questionId));
    const remaining = this.questions.filter(q => !answeredIds.has(q.id));
    if (remaining.length === 0) return null;

    const targetDifficulty = this.getTargetDifficulty(test.answers);

    const sortedCandidates = remaining
      .map(q => ({ q, delta: Math.abs(q.difficulty - targetDifficulty) }))
      .sort((a, b) => a.delta - b.delta || b.q.difficulty - a.q.difficulty);

    return sortedCandidates[0]?.q ?? null;
  }

  async submitAnswer(testId: string, answer: Omit<OnboardingAnswer, 'timestamp'>): Promise<boolean> {
    const test = await db.getOnboardingTestById(testId);
    if (!test || test.isCompleted) return false;

    const question = this.questions.find(q => q.id === answer.questionId);
    if (!question) return false;

    if (test.answers.some(a => a.questionId === answer.questionId)) {
      return false;
    }

    const fullAnswer: OnboardingAnswer = {
      ...answer,
      timestamp: new Date()
    };

    const updatedAnswers = [...test.answers, fullAnswer];

    await db.updateOnboardingTest(testId, {
      answers: updatedAnswers,
      currentQuestionIndex: updatedAnswers.length
    });

    return true;
  }

  async completeOnboarding(testId: string): Promise<TestResult> {
    const test = await db.getOnboardingTestById(testId);
    if (!test) throw new Error('Test not found');

    const totalQuestions = test.answers.length;
    if (totalQuestions === 0) {
      throw new Error('No answers submitted');
    }

    const correctAnswers = test.answers.filter(a => a.isCorrect).length;
    const averageTime = test.answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalQuestions;
    const averageConfidence = test.answers.reduce((sum, a) => sum + a.confidence, 0) / totalQuestions;

    const baseScore = (correctAnswers / totalQuestions) * 60;
    const difficultyBonus = this.calculateDifficultyBonus(test.answers, this.questions);
    const vocabularyLevelScore = Math.min(100, Math.round(baseScore + difficultyBonus));

    const weakAreas = this.identifyWeakAreas(test.answers, this.questions);

    const confidenceScore = averageConfidence / 100;

    const errorRate = 1 - (correctAnswers / totalQuestions);
    const timePenalty = Math.max(0, (averageTime - 30) / 60);
    const retentionRiskIndex = Math.min(1, errorRate + timePenalty * 0.3);

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

  private getTargetDifficulty(answers: OnboardingAnswer[]): number {
    if (answers.length === 0) return 3;

    const recentAnswers = answers.slice(-3);
    const correctRate = recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length;

    const avgDifficulty = recentAnswers.reduce((sum, a) => {
      const questionDifficulty = this.questions.find(q => q.id === a.questionId)?.difficulty ?? 3;
      return sum + questionDifficulty;
    }, 0) / recentAnswers.length;

    let target = Math.round(avgDifficulty);
    if (correctRate > 0.8) target += 1;
    if (correctRate < 0.4) target -= 1;

    return Math.max(1, Math.min(5, target));
  }

  private calculateDifficultyBonus(answers: OnboardingAnswer[], questions: OnboardingQuestion[]): number {
    let bonus = 0;
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && answer.isCorrect) {
        bonus += question.difficulty * 2;
      }
    }
    return Math.min(40, bonus);
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
}

export const onboardingEngine = new OnboardingEngine();