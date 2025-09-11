'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UsageTable from '@/components/usage/UsageTable';

interface AdminUser {
  id: string;
  email: string;
  isMaster: boolean;
  status: string;
  lastActive?: string;
}

interface UsageAnalyticsTabProps {
  currentAdmin: AdminUser;
}

export default function UsageAnalyticsTab({ currentAdmin }: UsageAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* API Usage Tracking */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            API Usage By User
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <UsageTable adminId={currentAdmin.id} />
        </CardContent>
      </Card>
    </div>
  );
} 