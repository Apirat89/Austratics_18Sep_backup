// This config file disables static generation for this page
// This is needed because useSearchParams() requires client-side only functionality
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const generateStaticParams = false;
export const dynamicParams = true;
export const runtime = 'nodejs';
export const preferredRegion = 'auto'; 