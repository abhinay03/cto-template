import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from './database';
import { User } from '../types';

const sessions = new Map<string, { userId: string; createdAt: Date }>();

function generateSessionId(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, keyHex] = storedHash.split(':');
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedKey = Buffer.from(keyHex, 'hex');

  return crypto.timingSafeEqual(derivedKey, storedKey);
}

export function createSession(userId: string): string {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { userId, createdAt: new Date() });
  return sessionId;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const sessionId = request.cookies.get('sessionId')?.value;
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  const user = await db.getUser(session.userId);
  if (!user) {
    sessions.delete(sessionId);
    return null;
  }

  return user.id;
}

export async function requireUserId(request: NextRequest): Promise<string | null> {
  return await getUserIdFromRequest(request);
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('sessionId', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production'
  });
}

export function publicUser(user: User): Omit<User, 'passwordHash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}
