'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage (which is now the main signin page)
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
} 