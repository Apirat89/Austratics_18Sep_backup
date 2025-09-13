// NO 'use client' here
import { Suspense } from 'react';
import ConfirmPageContent from './confirm-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmPageContent />
    </Suspense>
  );
} 