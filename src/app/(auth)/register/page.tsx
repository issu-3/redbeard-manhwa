'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.username,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically sign in after registration
      const signInRes = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (signInRes?.error) {
        setError('Registered successfully, but automatic login failed. Please sign in manually.');
        router.push('/login');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <h1 className="text-3xl font-bold text-gradient-primary" style={{ fontFamily: 'var(--font-heading)' }}>REDBEARD</h1>
        </Link>
        <p className="mt-2 text-sm text-text-muted">Create your account and start reading.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl md:p-8">
        {/* Social signup */}
        <div className="space-y-3">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-card-hover hover:border-border-hover">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-card-hover hover:border-border-hover">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
            Continue with Discord
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">or create with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text-secondary">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="username" type="text" value={form.username} onChange={(e) => update('username', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="coolreader42" required minLength={3} maxLength={30} />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Min. 8 characters" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-secondary">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Repeat password" required minLength={8} />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border bg-surface accent-primary" required />
            <span>I agree to the <Link href="/terms" className="text-primary hover:text-primary-hover">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:text-primary-hover">Privacy Policy</Link></span>
          </label>

          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:text-primary-hover">Sign in</Link>
      </p>
    </motion.div>
  );
}
