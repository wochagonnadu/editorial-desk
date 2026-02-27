// PATH: apps/web/src/pages/Login.tsx
// WHAT: Magic-link login screen wired to real auth endpoints
// WHY:  Replaces demo timeout flow with backend-driven session creation
// RELEVANT: apps/web/src/services/auth.ts,apps/web/src/services/session.tsx

import React, { useEffect, useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../services/api/client';
import { loginWithMagicLink, verifyMagicLink } from '../services/auth';
import { useSession } from '../services/session';

export function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session, setSession } = useSession();
  const redirectPath = (location.state as { from?: string } | null)?.from ?? '/app';

  useEffect(() => {
    if (!session) return;
    navigate(redirectPath, { replace: true });
  }, [navigate, redirectPath, session]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || session) return;

    const runVerify = async () => {
      try {
        setError(null);
        setIsVerifying(true);
        const nextSession = await verifyMagicLink(token);
        setSession(nextSession);
        navigate(redirectPath, { replace: true });
      } catch (verifyError) {
        if (verifyError instanceof ApiError) {
          setError(verifyError.message);
          return;
        }
        setError('Could not verify magic link');
      } finally {
        setIsVerifying(false);
      }
    };

    void runVerify();
  }, [navigate, redirectPath, searchParams, session, setSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setIsSubmitting(true);
      await loginWithMagicLink(email);
      setSent(true);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError('Could not send magic link');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-beige-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-serif font-medium text-ink-900 tracking-masthead uppercase">
          EditorialDESK
        </h1>
        <p className="mt-2 text-ink-500">Your editorial workspace</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-ink-100 sm:rounded-slide-sm sm:px-10">
          {isVerifying ? (
            <div className="text-center py-6">
              <p className="text-sm text-ink-500">Verifying your magic link...</p>
            </div>
          ) : !sent ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-900">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-ink-300" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-ink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent sm:text-sm"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900 transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Send magic link'}
                </button>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-approved-100 mb-4">
                <Mail className="h-6 w-6 text-approved-600" />
              </div>
              <h3 className="text-lg font-medium text-ink-900">Check your email</h3>
              <p className="mt-2 text-sm text-ink-500">
                We've sent a magic link to <span className="font-medium text-ink-900">{email}</span>
                .
              </p>
              <p className="mt-4 text-xs text-ink-400 flex items-center justify-center">
                Open the link from your inbox to continue <ArrowRight className="w-3 h-3 ml-1" />
              </p>
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              <p className="mt-4 text-xs text-ink-400">
                After verification you will return to {redirectPath}.
              </p>
            </div>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-ink-500">Secure, passwordless login</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
