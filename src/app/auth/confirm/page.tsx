import ConfirmClient from './confirm-content';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Force this to be a dynamic route by touching request headers
  headers();
  
  // Extract all search parameters to pass to the client component
  const code = typeof searchParams.code === 'string' ? searchParams.code : undefined;
  const token_hash = typeof searchParams.token_hash === 'string' ? searchParams.token_hash : undefined;
  const type = typeof searchParams.type === 'string' ? searchParams.type : undefined;
  const next = typeof searchParams.next === 'string' ? searchParams.next : '/dashboard';
  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;
  
  // Pass all params to client component without using useSearchParams()
  return <ConfirmClient 
    code={code}
    token_hash={token_hash}
    type={type}
    next={next}
    token={token}
  />;
} 