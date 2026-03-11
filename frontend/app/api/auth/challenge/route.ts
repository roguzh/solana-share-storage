import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { pendingChallenges } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { publicKey } = await req.json();

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Public key is required' },
        { status: 400 }
      );
    }

    // Generate nonce
    const nonce = randomBytes(32).toString('hex');
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Create message to sign
    const message = `Sign this message to authenticate with Enhanced Royalties.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

    // Store challenge with the exact message
    pendingChallenges.set(publicKey, { nonce, message, expires });

    return NextResponse.json({ message, nonce });
  } catch (error) {
    console.error('Challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}
