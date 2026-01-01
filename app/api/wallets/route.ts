import { NextResponse } from 'next/server';

/**
 * GET /api/wallets
 * 
 * IMPORTANT: Wallets are stored in browser localStorage, not on server!
 * This endpoint exists only to maintain API compatibility.
 * Returns empty response - client should read from localStorage directly.
 */
export async function GET() {
  // Wallets are client-side only (localStorage)
  // Server has no access to browser storage
  return NextResponse.json({ 
    wallets: null,
    message: 'Wallets are stored client-side in browser localStorage'
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
}
