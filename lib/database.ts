// Database service layer for vocabulary learning system
import { 
  User, Word, UserWord, OnboardingTest, DailySession, LearningAnalytics,
  WordState
} from '../types';

class DatabaseService {
  private users: Map<string, User> = new Map();
  private words: Map<string, Word> = new Map();
  private userWords: Map<string, UserWord> = new Map();
  private onboardingTests: Map<string, OnboardingTest> = new Map();
  private dailySessions: Map<string, DailySession> = new Map();
  private analytics: Map<string, LearningAnalytics> = new Map();

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Word operations
  async createWord(wordData: Omit<Word, 'id' | 'createdAt' | 'updatedAt'>): Promise<Word> {
    const word: Word = {
      ...wordData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.words.set(word.id, word);
    return word;
  }

  async getWord(id: string): Promise<Word | null> {
    return this.words.get(id) || null;
  }

  async getWordsByDifficulty(level: string): Promise<Word[]> {
    return Array.from(this.words.values()).filter(word => word.difficultyLevel === level);
  }

  async searchWords(query: string): Promise<Word[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.words.values()).filter(word => 
      word.word.toLowerCase().includes(lowercaseQuery) ||
      word.meanings.some(meaning => 
        meaning.definition.toLowerCase().includes(lowercaseQuery) ||
        meaning.translation.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  // User word operations
  async createUserWord(userWordData: Omit<UserWord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserWord> {
    const userWord: UserWord = {
      ...userWordData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userWords.set(userWord.id, userWord);
    return userWord;
  }

  async getUserWord(userId: string, wordId: string): Promise<UserWord | null> {
    const userWord = Array.from(this.userWords.values()).find(
      uw => uw.userId === userId && uw.wordId === wordId
    );
    return userWord || null;
  }

  async getUserWordById(id: string): Promise<UserWord | null> {
    return this.userWords.get(id) || null;
  }

  async getUserWords(userId: string): Promise<UserWord[]> {
    return Array.from(this.userWords.values()).filter(uw => uw.userId === userId);
  }

  async getWordsByState(userId: string, state: WordState): Promise<UserWord[]> {
    return Array.from(this.userWords.values()).filter(
      uw => uw.userId === userId && uw.wordState === state
    );
  }

  async getWordsForRevision(userId: string, count: number = 10): Promise<UserWord[]> {
    const today = new Date();
    return Array.from(this.userWords.values())
      .filter(uw => uw.userId === userId && uw.nextRevisionDate <= today)
      .sort((a, b) => a.nextRevisionDate.getTime() - b.nextRevisionDate.getTime())
      .slice(0, count);
  }

  async updateUserWord(id: string, updates: Partial<UserWord>): Promise<UserWord | null> {
    const userWord = this.userWords.get(id);
    if (!userWord) return null;
    
    const updatedUserWord = {
      ...userWord,
      ...updates,
      updatedAt: new Date()
    };
    this.userWords.set(id, updatedUserWord);
    return updatedUserWord;
  }

  // Onboarding test operations
  async createOnboardingTest(testData: Omit<OnboardingTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<OnboardingTest> {
    const test: OnboardingTest = {
      ...testData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingTests.set(test.id, test);
    return test;
  }

  async getOnboardingTest(userId: string): Promise<OnboardingTest | null> {
    const test = Array.from(this.onboardingTests.values()).find(t => t.userId === userId);
    return test || null;
  }

  async updateOnboardingTest(id: string, updates: Partial<OnboardingTest>): Promise<OnboardingTest | null> {
    const test = this.onboardingTests.get(id);
    if (!test) return null;
    
    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: new Date()
    };
    this.onboardingTests.set(id, updatedTest);
    return updatedTest;
  }

  // Daily session operations
  async createDailySession(sessionData: Omit<DailySession, 'id'>): Promise<DailySession> {
    const session: DailySession = {
      ...sessionData,
      id: this.generateId()
    };
    this.dailySessions.set(session.id, session);
    return session;
  }

  async getDailySession(id: string): Promise<DailySession | null> {
    return this.dailySessions.get(id) || null;
  }

  async getUserSessions(userId: string, limit: number = 10): Promise<DailySession[]> {
    return Array.from(this.dailySessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  async updateDailySession(id: string, updates: Partial<DailySession>): Promise<DailySession | null> {
    const session = this.dailySessions.get(id);
    if (!session) return null;
    
    const updatedSession = {
      ...session,
      ...updates
    };
    this.dailySessions.set(id, updatedSession);
    return updatedSession;
  }

  // Analytics operations
  async getUserAnalytics(userId: string): Promise<LearningAnalytics | null> {
    return this.analytics.get(userId) || null;
  }

  async updateUserAnalytics(userId: string, updates: Partial<LearningAnalytics>): Promise<LearningAnalytics> {
    const existing = this.analytics.get(userId);
    const analytics: LearningAnalytics = existing ? { ...existing, ...updates } : {
      userId,
      retentionRate: 0,
      forgettingCurve: 0,
      averageTimePerWord: 0,
      errorPatterns: [],
      learningVelocity: 0,
      weakAreaProgression: {},
      streakDays: 0,
      lastSessionDate: new Date(),
      ...updates
    };
    this.analytics.set(userId, analytics);
    return analytics;
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Seed method for development
  async seedDatabase(): Promise<void> {
    // Create sample words for testing
    const sampleWords = [
      {
        word: "analyze",
        phonetics: "/ˈænəlaɪz/",
        partOfSpeech: "verb" as const,
        difficultyLevel: "B2" as const,
        frequencyScore: 75,
        ageSuitability: ["teen", "adult"] as const,
        meanings: [
          {
            id: "1",
            wordId: "word1",
            level: "standard" as const,
            definition: "To examine something in detail to understand it better",
            translation: "Analizar",
            usage: "The scientist will analyze the data from the experiment."
          }
        ],
        examples: [
          {
            id: "1",
            wordId: "word1",
            level: "academic" as const,
            sentence: "Researchers analyze complex systems to identify patterns.",
            context: "Academic research",
            difficulty: 3
          }
        ],
        semanticMetadata: {
          synonyms: ["examine", "study", "investigate"],
          antonyms: ["ignore", "neglect"],
          confusableWords: ["analyse", "analysis"],
          rootWords: ["analysis"],
          usageNotes: ["Common in academic and professional contexts"],
          commonMistakes: ["Confusing with 'analyse' (British spelling)"]
        }
      },
      {
        word: "benevolent",
        phonetics: "/bəˈnevələnt/",
        partOfSpeech: "adjective" as const,
        difficultyLevel: "B2" as const,
        frequencyScore: 60,
        ageSuitability: ["teen", "adult"] as const,
        meanings: [
          {
            id: "2",
            wordId: "word2",
            level: "standard" as const,
            definition: "Well-meaning and kindly",
            translation: "Benévolo",
            usage: "The benevolent teacher always helped students who were struggling."
          }
        ],
        examples: [
          {
            id: "2",
            wordId: "word2",
            level: "academic" as const,
            sentence: "The organization's benevolent approach to social issues earned it widespread support.",
            context: "Formal/academic context",
            difficulty: 4
          }
        ],
        semanticMetadata: {
          synonyms: ["kind", "generous", "charitable"],
          antonyms: ["cruel", "selfish", "malevolent"],
          confusableWords: ["beneficial", "benevolent"],
          rootWords: ["bene- (good)", "velent"],
          usageNotes: ["Often used to describe people or organizations"],
          commonMistakes: ["Confusing with 'beneficial' (which means helpful, not necessarily kind)"]
        }
      },
      {
        word: "ephemeral",
        phonetics: "/ɪˈfɛmərəl/",
        partOfSpeech: "adjective" as const,
        difficultyLevel: "C1" as const,
        frequencyScore: 40,
        ageSuitability: ["adult"] as const,
        meanings: [
          {
            id: "3",
            wordId: "word3",
            level: "advanced" as const,
            definition: "Lasting for a very short time",
            translation: "Efímero",
            usage: "Beauty is often described as ephemeral."
          }
        ],
        examples: [
          {
            id: "3",
            wordId: "word3",
            level: "academic" as const,
            sentence: "The ephemeral nature of internet trends makes long-term prediction difficult.",
            context: "Academic writing",
            difficulty: 5
          }
        ],
        semanticMetadata: {
          synonyms: ["transient", "temporary", "fleeting"],
          antonyms: ["permanent", "everlasting", "enduring"],
          confusableWords: ["ephemeral", "epidemic"],
          rootWords: ["ephemera (things that last a short time)"],
          usageNotes: ["More common in literary and academic contexts"],
          commonMistakes: ["Confusing with 'epidemic' (disease outbreak)"]
        }
      },
      {
        word: "meticulous",
        phonetics: "/mɪˈtɪkjʊləs/",
        partOfSpeech: "adjective" as const,
        difficultyLevel: "B2" as const,
        frequencyScore: 65,
        ageSuitability: ["teen", "adult"] as const,
        meanings: [
          {
            id: "4",
            wordId: "word4",
            level: "standard" as const,
            definition: "Very careful and precise",
            translation: "Meticuloso",
            usage: "She was meticulous in her research methodology."
          }
        ],
        examples: [
          {
            id: "4",
            wordId: "word4",
            level: "conversational" as const,
            sentence: "His meticulous attention to detail made him an excellent editor.",
            context: "Professional context",
            difficulty: 3
          }
        ],
        semanticMetadata: {
          synonyms: ["precise", "careful", "thorough"],
          antonyms: ["careless", "sloppy", "hasty"],
          confusableWords: ["meticulous", "methodical"],
          rootWords: ["meticula (small mark)"],
          usageNotes: ["Often used with 'attention to detail'"],
          commonMistakes: ["Using in place of 'methodical' - meticulous means careful, not necessarily organized"]
        }
      },
      {
        word: "eloquent",
        phonetics: "/ˈɛləkwənt/",
        partOfSpeech: "adjective" as const,
        difficultyLevel: "B2" as const,
        frequencyScore: 70,
        ageSuitability: ["teen", "adult"] as const,
        meanings: [
          {
            id: "5",
            wordId: "word5",
            level: "standard" as const,
            definition: "Fluent and persuasive in speaking or writing",
            translation: "Elocuente",
            usage: "The eloquent speaker captivated the audience."
          }
        ],
        examples: [
          {
            id: "5",
            wordId: "word5",
            level: "academic" as const,
            sentence: "The essay was praised for its eloquent expression of complex ideas.",
            context: "Academic praise",
            difficulty: 3
          }
        ],
        semanticMetadata: {
          synonyms: ["articulate", "fluent", "persuasive"],
          antonyms: ["inarticulate", "mumbling", "halting"],
          confusableWords: ["eloquent", "elaborate"],
          rootWords: ["e- (out) + loqui (to speak)"],
          usageNotes: ["Can describe speakers, writers, or speeches"],
          commonMistakes: ["Confusing with 'elaborate' (detailed, complex)"]
        }
      }
    ];

    for (const wordData of sampleWords) {
      await this.createWord(wordData);
    }

    // Create some sample users for testing
    const sampleUsers = [
      {
        primaryLanguage: "English",
        educationLevel: "college",
        purpose: "career" as const,
        readingHabit: "frequent" as const,
        preferredContentType: "examples" as const,
        vocabularyLevelScore: 0,
        weakAreas: [],
        confidenceScore: 0,
        retentionRiskIndex: 0
      }
    ];

    for (const userData of sampleUsers) {
      await this.createUser(userData);
    }
  }
}

export const db = new DatabaseService();