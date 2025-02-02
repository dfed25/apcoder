import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check if we're on an auth page
    const isAuthPage = req.nextUrl.pathname === '/'
    
    if (!session && !isAuthPage) {
      // Redirect to login if accessing protected route without session
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (session && isAuthPage) {
      // Redirect to home if accessing login page with active session
      return NextResponse.redirect(new URL('/home', req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
  }
}

export const config = {
  matcher: ['/', '/home', '/chat/:path*']
}