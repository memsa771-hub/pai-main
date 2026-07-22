'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (isLoggedIn) {
      router.push('/chat');
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      router.push('/chat');
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
      <div className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="PAI Logo" className="h-8 w-auto" />
        <span className="font-heading text-xl font-bold">
          <span className="text-primary">Placement</span> <span className="text-[#0f172a]">AI</span>
        </span>
      </div>

      <motion.div
        className="w-full max-w-[420px] bg-white rounded-2xl shadow-lg border border-[#e2e8f0] p-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#e6ebf8] text-primary rounded-xl flex items-center justify-center mb-6">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-[#0f172a]">Welcome Back</h1>
          <p className="text-sm text-[#475569] mt-2">Powering your admissions journey with AI</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-heading font-semibold text-[#475569] mb-1.5" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="email"
                id="email"
                className="w-full pl-11 pr-4 py-3 border border-[#e2e8f0] rounded-xl bg-white text-sm text-[#0f172a] focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-heading font-semibold text-[#475569] mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="w-full pl-11 pr-11 py-3 border border-[#e2e8f0] rounded-xl bg-white text-sm text-[#0f172a] focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
              <input type="checkbox" className="rounded" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 text-[#ef4444] text-sm font-semibold bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-3 mb-4"
              >
                <AlertTriangle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full bg-primary text-white font-heading font-semibold py-3 rounded-full hover:bg-[#002276] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Verifying...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[#475569] mt-6">
          Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline">Create an Account</Link>
        </p>
      </motion.div>
    </div>
  );
}