import { NextResponse } from 'next/server';
import { db } from '../../../../lib/database';

// POST /api/dev/seed - Seed the database with sample data
export async function POST() {
  try {
    await db.seedDatabase();
    
    return NextResponse.json({ 
      message: 'Database seeded successfully',
      status: 'success'
    }, { status: 200 });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ 
      error: 'Failed to seed database',
      status: 'error'
    }, { status: 500 });
  }
}

// GET /api/dev/seed - Check seeding status
export async function GET() {
  try {
    // Check if we have any words in the database
    const words = await db.getWordsByDifficulty('B2');
    const hasData = words.length > 0;
    
    return NextResponse.json({ 
      hasData,
      wordCount: words.length,
      status: hasData ? 'already_seeded' : 'needs_seeding'
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking seed status:', error);
    return NextResponse.json({ 
      error: 'Failed to check seed status',
      status: 'error'
    }, { status: 500 });
  }
}