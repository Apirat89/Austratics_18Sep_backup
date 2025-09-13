import { Suspense } from 'react';
import ConfirmContent from './confirm-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
} 