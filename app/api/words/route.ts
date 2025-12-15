import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';
import { Word, CEFRLevel, PartOfSpeech } from '../../../types';

// GET /api/words - Search or get words
export async function GET(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const difficulty = searchParams.get('difficulty');
    const partOfSpeech = searchParams.get('partOfSpeech');
    const limit = parseInt(searchParams.get('limit') || '20');

    let words: Word[] = [];

    if (query) {
      words = (await db.searchWords(query)).slice(0, limit);
    } else if (difficulty || partOfSpeech) {
      const allWords = difficulty ? await db.getWordsByDifficulty(difficulty) : await db.getAllWords();
      const filtered = partOfSpeech ? allWords.filter(w => w.partOfSpeech === partOfSpeech) : allWords;
      words = filtered.slice(0, limit);
    } else {
      words = (await db.getAllWords()).slice(0, limit);
    }

    return NextResponse.json({ words }, { status: 200 });
  } catch (error) {
    console.error('Error fetching words:', error);
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}

// POST /api/words - Create a new word (for admin purposes)
export async function POST(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const body = await request.json();
    const { 
      word, 
      phonetics, 
      partOfSpeech, 
      difficultyLevel, 
      frequencyScore, 
      ageSuitability,
      meanings,
      examples,
      semanticMetadata
    } = body;

    // Validate required fields
    if (!word || !partOfSpeech || !difficultyLevel || !meanings || !examples) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const wordData: Omit<Word, 'id' | 'createdAt' | 'updatedAt'> = {
      word,
      phonetics: phonetics || '',
      partOfSpeech: partOfSpeech as PartOfSpeech,
      difficultyLevel: difficultyLevel as CEFRLevel,
      frequencyScore: frequencyScore || 50,
      ageSuitability: ageSuitability || ['adult'],
      meanings,
      examples,
      semanticMetadata: semanticMetadata || {
        synonyms: [],
        antonyms: [],
        confusableWords: [],
        rootWords: [],
        usageNotes: [],
        commonMistakes: []
      }
    };

    const newWord = await db.createWord(wordData);

    return NextResponse.json({ word: newWord }, { status: 201 });
  } catch (error) {
    console.error('Error creating word:', error);
    return NextResponse.json({ error: 'Failed to create word' }, { status: 500 });
  }
}