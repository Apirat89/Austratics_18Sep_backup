import ResetPasswordClient from './reset-password-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Extract token from search parameters to pass to client component
  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;
  
  // Pass token to client component without using useSearchParams()
  return <ResetPasswordClient token={token} />;
} 