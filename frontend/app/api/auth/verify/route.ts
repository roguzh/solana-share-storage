import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getIronSession } from 'iron-session';
import { sessionOptions, pendingChallenges, SessionData } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signature, nonce } = await req.json();

    if (!publicKey || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify nonce exists and hasn't expired
    const challenge = pendingChallenges.get(publicKey);
    if (!challenge) {
      return NextResponse.json(
        { error: 'No challenge found for this public key' },
        { status: 401 }
      );
    }

    if (challenge.nonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      );
    }

    if (challenge.expires < Date.now()) {
      pendingChallenges.delete(publicKey);
      return NextResponse.json(
        { error: 'Challenge expired' },
        { status: 401 }
      );
    }

    // Use the EXACT stored message (not reconstructed)
    const messageBytes = new TextEncoder().encode(challenge.message);

    // Verify signature using tweetnacl
    try {
      const pubKey = new PublicKey(publicKey);
      const sig = bs58.decode(signature);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        sig,
        pubKey.toBytes()
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      // Create session
      const response = NextResponse.json({ success: true });
      const session = await getIronSession<SessionData>(req, response, sessionOptions);

      session.publicKey = publicKey;
      session.authenticated = true;
      await session.save();

      // Clean up challenge
      pendingChallenges.delete(publicKey);

      return response;
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
