'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { signInSchema, type SignInFormData } from '../utils/validation';

export function SignInForm() {
  const { signIn, isLoading, error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    const result = await signIn(data);

    if (result.success) {
      window.location.href = '/';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="text-primary text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          {...register('password')}
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-primary text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="text-primary text-sm p-3 bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-accent text-white py-2 px-4 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
