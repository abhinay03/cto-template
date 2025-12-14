import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, deleteSession } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
