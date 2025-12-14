import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';

// GET /api/words/[wordId] - Get a single word by ID
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ wordId: string }> }
) {
  try {
    await db.ensureSeeded();

    const { wordId } = await context.params;
    const word = await db.getWord(wordId);
    if (!word) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    return NextResponse.json({ word }, { status: 200 });
  } catch (error) {
    console.error('Error fetching word:', error);
    return NextResponse.json({ error: 'Failed to fetch word' }, { status: 500 });
  }
}
