// Core types for the vocabulary learning system

export interface User {
  id: string;
  primaryLanguage: string;
  educationLevel: string;
  purpose: LearningPurpose;
  readingHabit: ReadingHabit;
  preferredContentType: ContentType;
  vocabularyLevelScore: number;
  weakAreas: WeakArea[];
  confidenceScore: number;
  retentionRiskIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: string;
  word: string;
  phonetics: string;
  partOfSpeech: PartOfSpeech;
  difficultyLevel: CEFRLevel;
  frequencyScore: number;
  ageSuitability: AgeGroup[];
  meanings: WordMeaning[];
  examples: WordExample[];
  semanticMetadata: SemanticMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordMeaning {
  id: string;
  wordId: string;
  level: MeaningLevel;
  definition: string;
  translation: string;
  usage: string;
}

export interface WordExample {
  id: string;
  wordId: string;
  level: ExampleLevel;
  sentence: string;
  context: string;
  difficulty: number;
}

export interface SemanticMetadata {
  synonyms: string[];
  antonyms: string[];
  confusableWords: string[];
  rootWords: string[];
  usageNotes: string[];
  commonMistakes: string[];
}

export interface UserWord {
  id: string;
  userId: string;
  wordId: string;
  familiarityScore: number;
  lastSeen: Date;
  nextRevisionDate: Date;
  revisionCount: number;
  confidenceRating: number;
  errorHistory: ErrorRecord[];
  wordState: WordState;

  // Optional SRS fields to improve scheduling/state transitions
  srsEaseFactor?: number;
  srsInterval?: number;
  srsRepetition?: number;
  srsConsecutiveCorrect?: number;
  srsConsecutiveIncorrect?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ErrorRecord {
  date: Date;
  errorType: ErrorType;
  context: string;
  attemptedAnswer: string;
  correctAnswer: string;
}

export interface OnboardingTest {
  id: string;
  userId: string;
  currentQuestionIndex: number;
  answers: OnboardingAnswer[];
  isCompleted: boolean;
  vocabularyLevelScore: number;
  weakAreas: WeakArea[];
  confidenceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingQuestion {
  id: string;
  type: QuestionType;
  question: string;
  difficulty: number;
  options: QuestionOption[];
  correctAnswer: string;
  weakArea: WeakArea;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface OnboardingAnswer {
  questionId: string;
  selectedOptionId: string;
  timeSpent: number;
  confidence: number;
  isCorrect: boolean;
  timestamp: Date;
}

export interface DailySession {
  id: string;
  userId: string;
  sessionType: SessionType;
  words: SessionWord[];
  completedWords: string[];
  totalWords: number;
  correctAnswers: number;
  sessionDuration: number;
  startedAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
}

export interface SessionWord {
  userWordId: string;
  wordId: string;
  activityType: ActivityType;
  priority: Priority;
  isCompleted: boolean;
  attempts: SessionAttempt[];
}

export interface SessionAttempt {
  timestamp: Date;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence: number;
  hint: boolean;
}

export interface ErrorPattern {
  errorType: ErrorType;
  count: number;
  lastOccurred: Date;
}

export interface LearningAnalytics {
  userId: string;
  retentionRate: number;
  forgettingCurve: number;
  averageTimePerWord: number;
  errorPatterns: ErrorPattern[];
  learningVelocity: number;
  weakAreaProgression: { [key in WeakArea]?: number };
  streakDays: number;
  lastSessionDate: Date;
}

// Enums and types
export type LearningPurpose = 'school' | 'exams' | 'career' | 'general_improvement';
export type ReadingHabit = 'rare' | 'sometimes' | 'frequent';
export type ContentType = 'examples' | 'stories' | 'quizzes' | 'mixed';
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior';
export type MeaningLevel = 'simple' | 'standard' | 'advanced';
export type ExampleLevel = 'child-friendly' | 'academic' | 'professional' | 'conversational';
export type WordState = 'new' | 'learning' | 'weak' | 'known' | 'mastered' | 'at_risk';
export type ErrorType = 'meaning_confusion' | 'spelling_error' | 'context_misuse' | 'synonym_confusion';
export type QuestionType = 'word_recognition' | 'meaning_match' | 'contextual_usage' | 'synonym_match';
export type SessionType = 'new_words' | 'revision' | 'weak_words' | 'challenge' | 'mixed';
export type ActivityType = 'flashcard' | 'mcq' | 'sentence_building' | 'story_usage' | 'audio' | 'image_association';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type WeakArea = 'verbs' | 'adjectives' | 'nouns' | 'adverbs' | 'academic_vocabulary' | 'idioms' | 'conversational' | 'technical';