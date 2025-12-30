import { NextResponse } from 'next/server';
import { getWallets } from '@/lib/wallets';

export async function GET() {
  try {
    const wallets = await getWallets();
    
    if (!wallets) {
      return NextResponse.json({ wallets: null }, { status: 200 });
    }

    return NextResponse.json({ wallets }, { status: 200 });
  } catch (error) {
    console.error('Get wallets error:', error);
    return NextResponse.json(
      { error: 'Failed to get wallets' },
      { status: 500 }
    );
  }
}
