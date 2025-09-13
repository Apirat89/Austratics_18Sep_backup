import { Suspense } from 'react';
import ResetPasswordContent from './reset-password-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
} 