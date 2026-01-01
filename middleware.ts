import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prefetch hints for critical assets
  response.headers.set(
    'Link',
    '</api/wallets>; rel=prefetch, </api/prices>; rel=prefetch'
  );

  // Enable compression
  response.headers.set('Content-Encoding', 'gzip');

  return response;
}

export const config = {
  matcher: '/',
};
