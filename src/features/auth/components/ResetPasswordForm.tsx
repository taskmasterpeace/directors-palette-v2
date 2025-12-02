'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { usePasswordReset } from '../hooks/usePasswordReset';
import { resetPasswordSchema, type ResetPasswordFormData } from '../utils/validation';

export function ResetPasswordForm() {
  const { resetPassword, isLoading, error, success, message } = usePasswordReset();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    const result = await resetPassword(data.password);

    if (result.success) {
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="text-green-600 text-sm p-4 bg-green-50 rounded-lg">
          {message}
        </div>
        <p className="text-center text-sm text-gray-600">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          New Password
        </label>
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
        {!errors.password && (
          <p className="text-xs text-gray-500 mt-1">
            Min 8 characters, uppercase, lowercase, and number
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="text-primary text-sm mt-1">{errors.confirmPassword.message}</p>
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
        {isLoading ? 'Updating...' : 'Reset Password'}
      </button>
    </form>
  );
}
