import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.json({ authenticated: false });
    const session = await getIronSession<SessionData>(req, response, sessionOptions);

    if (session.authenticated && session.publicKey) {
      return NextResponse.json({
        authenticated: true,
        publicKey: session.publicKey,
      });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(req, response, sessionOptions);

    session.destroy();

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
