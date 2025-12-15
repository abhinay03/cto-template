'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to sign up');
        return;
      }

      router.replace('/dashboard');
    } catch {
      setError('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />

              <div className="text-xs text-gray-600">
                Use at least 8 characters. This demo stores accounts in memory for development.
              </div>

              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </Button>

              <div className="text-center text-sm text-gray-700">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-700 hover:text-blue-800">
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
