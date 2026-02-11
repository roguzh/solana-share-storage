import { SessionOptions } from 'iron-session';

export interface SessionData {
  publicKey?: string;
  authenticated?: boolean;
  nonce?: string;
  nonceExpires?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'enhanced_royalties_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  },
};

// In-memory nonce storage (for development; use Redis in production)
// Stores the full signed message so we can verify the exact bytes
export const pendingChallenges = new Map<
  string,
  { nonce: string; message: string; expires: number }
>();
