import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
      // Simulate magic link click after a short delay for demo purposes
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-beige-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-serif font-medium text-ink-900 tracking-masthead uppercase">EditorialDESK</h1>
        <p className="mt-2 text-ink-500">Your editorial workspace</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-ink-100 sm:rounded-slide-sm sm:px-10">
          {!sent ? (
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
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-ink-900 hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900 transition-colors"
                >
                  Send magic link
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-approved-100 mb-4">
                <Mail className="h-6 w-6 text-approved-600" />
              </div>
              <h3 className="text-lg font-medium text-ink-900">Check your email</h3>
              <p className="mt-2 text-sm text-ink-500">
                We've sent a magic link to <span className="font-medium text-ink-900">{email}</span>.
              </p>
              <p className="mt-4 text-xs text-ink-400 flex items-center justify-center">
                Logging you in automatically for demo... <ArrowRight className="w-3 h-3 ml-1 animate-pulse" />
              </p>
            </div>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-ink-500">
                  Secure, passwordless login
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
