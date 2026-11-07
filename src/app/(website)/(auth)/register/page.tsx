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

    if (!form.email || !form.username || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
    if (!termsCheckbox?.checked) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
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
        identifier: form.email,
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
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text-secondary">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="username" type="text" value={form.username} onChange={(e) => update('username', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="coolreader42" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-secondary">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Repeat password" />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border bg-surface accent-primary" id="terms" />
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
