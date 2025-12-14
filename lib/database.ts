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

  private hasSeeded = false;

  async ensureSeeded(): Promise<void> {
    if (this.hasSeeded) return;
    if (this.words.size > 0) {
      this.hasSeeded = true;
      return;
    }

    await this.seedDatabase();
    this.hasSeeded = true;
  }

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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
    const id = this.generateId();
    const now = new Date();

    const word: Word = {
      ...wordData,
      id,
      meanings: wordData.meanings.map((meaning, index) => ({
        ...meaning,
        id: meaning.id || `${id}-m${index}`,
        wordId: id
      })),
      examples: wordData.examples.map((example, index) => ({
        ...example,
        id: example.id || `${id}-e${index}`,
        wordId: id
      })),
      createdAt: now,
      updatedAt: now
    };

    this.words.set(word.id, word);
    return word;
  }

  async getWord(id: string): Promise<Word | null> {
    return this.words.get(id) || null;
  }

  async getAllWords(): Promise<Word[]> {
    return Array.from(this.words.values());
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
    const tests = Array.from(this.onboardingTests.values()).filter(t => t.userId === userId);
    if (tests.length === 0) return null;

    return tests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async getOnboardingTestById(testId: string): Promise<OnboardingTest | null> {
    return this.onboardingTests.get(testId) || null;
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
    if (this.words.size > 0) return;

    const sampleWords: Array<Omit<Word, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        word: 'apple',
        phonetics: '/ˈæpəl/',
        partOfSpeech: 'noun',
        difficultyLevel: 'A1',
        frequencyScore: 95,
        ageSuitability: ['child', 'teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'apple-simple',
            wordId: '',
            level: 'simple',
            definition: 'A round fruit that can be red, green, or yellow.',
            translation: 'Manzana',
            usage: 'I ate an apple for a snack.'
          }
        ],
        examples: [
          {
            id: 'apple-ex',
            wordId: '',
            level: 'child-friendly',
            sentence: 'She picked a red apple from the tree.',
            context: 'Everyday',
            difficulty: 1
          }
        ],
        semanticMetadata: {
          synonyms: [],
          antonyms: [],
          confusableWords: [],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'run',
        phonetics: '/rʌn/',
        partOfSpeech: 'verb',
        difficultyLevel: 'A1',
        frequencyScore: 98,
        ageSuitability: ['child', 'teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'run-simple',
            wordId: '',
            level: 'simple',
            definition: 'To move quickly on your feet.',
            translation: 'Correr',
            usage: 'I run to catch the bus.'
          }
        ],
        examples: [
          {
            id: 'run-ex',
            wordId: '',
            level: 'child-friendly',
            sentence: 'The dog can run very fast.',
            context: 'Everyday',
            difficulty: 1
          }
        ],
        semanticMetadata: {
          synonyms: ['jog'],
          antonyms: ['walk'],
          confusableWords: [],
          rootWords: [],
          usageNotes: ['Also used for machines: "The engine runs."'],
          commonMistakes: []
        }
      },
      {
        word: 'happy',
        phonetics: '/ˈhæpi/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'A1',
        frequencyScore: 97,
        ageSuitability: ['child', 'teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'happy-simple',
            wordId: '',
            level: 'simple',
            definition: 'Feeling good and pleased.',
            translation: 'Feliz',
            usage: 'She feels happy today.'
          }
        ],
        examples: [
          {
            id: 'happy-ex',
            wordId: '',
            level: 'child-friendly',
            sentence: 'He is happy because he got a gift.',
            context: 'Everyday',
            difficulty: 1
          }
        ],
        semanticMetadata: {
          synonyms: ['glad'],
          antonyms: ['sad'],
          confusableWords: [],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'travel',
        phonetics: '/ˈtrævəl/',
        partOfSpeech: 'verb',
        difficultyLevel: 'A2',
        frequencyScore: 85,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'travel-standard',
            wordId: '',
            level: 'standard',
            definition: 'To go from one place to another, often far away.',
            translation: 'Viajar',
            usage: 'They travel to different countries each year.'
          }
        ],
        examples: [
          {
            id: 'travel-ex',
            wordId: '',
            level: 'conversational',
            sentence: 'I love to travel by train.',
            context: 'Conversation',
            difficulty: 2
          }
        ],
        semanticMetadata: {
          synonyms: ['journey'],
          antonyms: [],
          confusableWords: ['trip'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'borrow',
        phonetics: '/ˈbɒrəʊ/',
        partOfSpeech: 'verb',
        difficultyLevel: 'A2',
        frequencyScore: 80,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'borrow-standard',
            wordId: '',
            level: 'standard',
            definition: 'To take and use something for a short time, then return it.',
            translation: 'Pedir prestado',
            usage: 'Can I borrow your pen?'
          }
        ],
        examples: [
          {
            id: 'borrow-ex',
            wordId: '',
            level: 'conversational',
            sentence: 'May I borrow your book for the weekend?',
            context: 'Conversation',
            difficulty: 2
          }
        ],
        semanticMetadata: {
          synonyms: [],
          antonyms: ['lend'],
          confusableWords: ['lend'],
          rootWords: [],
          usageNotes: ['You borrow from someone; you lend to someone.'],
          commonMistakes: ['Mixing up borrow and lend']
        }
      },
      {
        word: 'achieve',
        phonetics: '/əˈtʃiːv/',
        partOfSpeech: 'verb',
        difficultyLevel: 'B1',
        frequencyScore: 70,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'achieve-standard',
            wordId: '',
            level: 'standard',
            definition: 'To succeed in doing something after trying hard.',
            translation: 'Lograr',
            usage: 'She worked hard to achieve her goals.'
          }
        ],
        examples: [
          {
            id: 'achieve-ex',
            wordId: '',
            level: 'academic',
            sentence: 'Students can achieve better results with consistent practice.',
            context: 'School',
            difficulty: 3
          }
        ],
        semanticMetadata: {
          synonyms: ['accomplish'],
          antonyms: ['fail'],
          confusableWords: ['receive'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'curious',
        phonetics: '/ˈkjʊəriəs/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'B1',
        frequencyScore: 65,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'curious-standard',
            wordId: '',
            level: 'standard',
            definition: 'Wanting to know or learn something.',
            translation: 'Curioso',
            usage: 'I am curious about how it works.'
          }
        ],
        examples: [
          {
            id: 'curious-ex',
            wordId: '',
            level: 'conversational',
            sentence: 'She was curious and asked many questions.',
            context: 'Conversation',
            difficulty: 3
          }
        ],
        semanticMetadata: {
          synonyms: ['inquisitive'],
          antonyms: ['indifferent'],
          confusableWords: ['serious'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'analyze',
        phonetics: '/ˈænəlaɪz/',
        partOfSpeech: 'verb',
        difficultyLevel: 'B2',
        frequencyScore: 75,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'analyze-standard',
            wordId: '',
            level: 'standard',
            definition: 'To examine something in detail to understand it better.',
            translation: 'Analizar',
            usage: 'The scientist will analyze the data from the experiment.'
          }
        ],
        examples: [
          {
            id: 'analyze-ex',
            wordId: '',
            level: 'academic',
            sentence: 'Researchers analyze complex systems to identify patterns.',
            context: 'Academic research',
            difficulty: 4
          }
        ],
        semanticMetadata: {
          synonyms: ['examine', 'study', 'investigate'],
          antonyms: ['ignore', 'neglect'],
          confusableWords: ['analyse', 'analysis'],
          rootWords: ['analysis'],
          usageNotes: ['Common in academic and professional contexts'],
          commonMistakes: ["Confusing with 'analyse' (British spelling)"]
        }
      },
      {
        word: 'benevolent',
        phonetics: '/bəˈnevələnt/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'B2',
        frequencyScore: 60,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'benevolent-standard',
            wordId: '',
            level: 'standard',
            definition: 'Kind and wanting to help others.',
            translation: 'Benévolo',
            usage: 'The benevolent teacher always helped students who were struggling.'
          }
        ],
        examples: [
          {
            id: 'benevolent-ex',
            wordId: '',
            level: 'professional',
            sentence: 'The company supported a benevolent program for local schools.',
            context: 'Workplace',
            difficulty: 4
          }
        ],
        semanticMetadata: {
          synonyms: ['kind', 'generous', 'charitable'],
          antonyms: ['cruel', 'selfish', 'malevolent'],
          confusableWords: ['beneficial'],
          rootWords: ['bene- (good)'],
          usageNotes: ['Often used to describe people or organizations'],
          commonMistakes: ['Confusing with "beneficial" (helpful)']
        }
      },
      {
        word: 'meticulous',
        phonetics: '/məˈtɪkjʊləs/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'B2',
        frequencyScore: 65,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'meticulous-standard',
            wordId: '',
            level: 'standard',
            definition: 'Very careful and precise.',
            translation: 'Meticuloso',
            usage: 'He kept meticulous notes during the meeting.'
          }
        ],
        examples: [
          {
            id: 'meticulous-ex',
            wordId: '',
            level: 'professional',
            sentence: 'Her meticulous attention to detail improved the final report.',
            context: 'Workplace',
            difficulty: 4
          }
        ],
        semanticMetadata: {
          synonyms: ['thorough', 'careful'],
          antonyms: ['careless'],
          confusableWords: ['methodical'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'eloquent',
        phonetics: '/ˈeləkwənt/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'B2',
        frequencyScore: 70,
        ageSuitability: ['teen', 'adult', 'senior'],
        meanings: [
          {
            id: 'eloquent-standard',
            wordId: '',
            level: 'standard',
            definition: 'Fluent and persuasive in speaking or writing.',
            translation: 'Elocuente',
            usage: 'The eloquent speaker captivated the audience.'
          }
        ],
        examples: [
          {
            id: 'eloquent-ex',
            wordId: '',
            level: 'academic',
            sentence: 'The essay was praised for its eloquent expression of complex ideas.',
            context: 'School',
            difficulty: 4
          }
        ],
        semanticMetadata: {
          synonyms: ['articulate', 'fluent'],
          antonyms: ['inarticulate'],
          confusableWords: ['elaborate'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'ephemeral',
        phonetics: '/ɪˈfemərəl/',
        partOfSpeech: 'adjective',
        difficultyLevel: 'C1',
        frequencyScore: 40,
        ageSuitability: ['adult', 'senior'],
        meanings: [
          {
            id: 'ephemeral-advanced',
            wordId: '',
            level: 'advanced',
            definition: 'Lasting for a very short time.',
            translation: 'Efímero',
            usage: 'Fame can be ephemeral.'
          }
        ],
        examples: [
          {
            id: 'ephemeral-ex',
            wordId: '',
            level: 'academic',
            sentence: 'The ephemeral nature of online trends makes long-term prediction difficult.',
            context: 'Academic writing',
            difficulty: 5
          }
        ],
        semanticMetadata: {
          synonyms: ['transient', 'fleeting'],
          antonyms: ['permanent', 'enduring'],
          confusableWords: ['epidemic'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'scrutinize',
        phonetics: '/ˈskruːtənaɪz/',
        partOfSpeech: 'verb',
        difficultyLevel: 'C1',
        frequencyScore: 35,
        ageSuitability: ['adult', 'senior'],
        meanings: [
          {
            id: 'scrutinize-advanced',
            wordId: '',
            level: 'advanced',
            definition: 'To examine something very carefully and critically.',
            translation: 'Examinar minuciosamente',
            usage: 'Auditors scrutinize financial statements.'
          }
        ],
        examples: [
          {
            id: 'scrutinize-ex',
            wordId: '',
            level: 'professional',
            sentence: 'The contract was scrutinized by the legal team.',
            context: 'Workplace',
            difficulty: 5
          }
        ],
        semanticMetadata: {
          synonyms: ['inspect', 'examine'],
          antonyms: ['overlook'],
          confusableWords: [],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      },
      {
        word: 'obfuscate',
        phonetics: '/ˈɒbfʌskeɪt/',
        partOfSpeech: 'verb',
        difficultyLevel: 'C2',
        frequencyScore: 15,
        ageSuitability: ['adult', 'senior'],
        meanings: [
          {
            id: 'obfuscate-advanced',
            wordId: '',
            level: 'advanced',
            definition: 'To make something unclear or harder to understand.',
            translation: 'Ofuscar',
            usage: 'Jargon can obfuscate the main point.'
          }
        ],
        examples: [
          {
            id: 'obfuscate-ex',
            wordId: '',
            level: 'academic',
            sentence: 'The author did not intend to obfuscate the argument with unnecessary complexity.',
            context: 'Academic writing',
            difficulty: 5
          }
        ],
        semanticMetadata: {
          synonyms: ['confuse', 'obscure'],
          antonyms: ['clarify'],
          confusableWords: ['obfuscation'],
          rootWords: [],
          usageNotes: [],
          commonMistakes: []
        }
      }
    ];

    for (const wordData of sampleWords) {
      await this.createWord(wordData);
    }
  }
}

export const db = new DatabaseService();