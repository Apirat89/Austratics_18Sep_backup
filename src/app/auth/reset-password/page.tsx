// NO 'use client' here
import { Suspense } from 'react';
import ResetPasswordContent from './reset-password-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
} 