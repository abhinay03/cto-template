import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { createSession, publicUser, setSessionCookie, verifyPassword } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    await db.ensureSeeded();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) }, { status: 200 });
    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
  }
}
