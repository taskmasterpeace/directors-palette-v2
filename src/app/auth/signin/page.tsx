import { SignInForm } from '@/features/auth/components/SignInForm';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      {/* Back to Landing Link */}
      <div className="absolute top-4 left-4">
        <Link
          href="/landing"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="bg-card text-card-foreground p-8 rounded-lg shadow-lg w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image
              src="/favicon.ico"
              alt="Directors Palette"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                Directors Palette
              </h1>
              <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
                Beta
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-center text-sm">
            AI-powered visual storytelling
          </p>
        </div>

        <p className="text-gray-600 text-center mb-8">
          Sign in to access your account
        </p>

        <SignInForm />
      </div>
    </div>
  );
}
