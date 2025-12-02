'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { usePasswordReset } from '../hooks/usePasswordReset';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../utils/validation';

export function ForgotPasswordForm() {
  const { requestReset, isLoading, error, success, message } = usePasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await requestReset(data.email);
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="text-green-600 text-sm p-4 bg-green-50 rounded-lg">
          {message}
        </div>
        <Link
          href="/auth/signin"
          className="block text-center text-blue-600 hover:underline text-sm"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address
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
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>

      <Link
        href="/auth/signin"
        className="block text-center text-gray-600 hover:text-gray-800 text-sm"
      >
        Back to Sign In
      </Link>
    </form>
  );
}
