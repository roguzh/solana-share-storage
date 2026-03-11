import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  // Check if requesting a dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(
        request,
        response,
        sessionOptions
      );

      // If not authenticated, redirect to home
      if (!session.authenticated) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
