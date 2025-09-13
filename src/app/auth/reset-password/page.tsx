import { redirect } from 'next/navigation';

// This is a server component that immediately redirects to the client component
// This avoids the useSearchParams issue during build time
export default function ResetPasswordPage({ searchParams }: { searchParams: { [key: string]: string } }) {
  const params = new URLSearchParams();
  
  // Forward all search parameters to the client page
  Object.entries(searchParams).forEach(([key, value]) => {
    params.append(key, value);
  });
  
  // Redirect to the client page that will handle the actual reset password
  redirect(`/auth/reset-password-client?${params.toString()}`);
} 