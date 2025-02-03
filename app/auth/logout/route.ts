import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  // Sign out the user
  await (await supabase).auth.signOut();

  // Redirect to login page
  return NextResponse.redirect(new URL('/', request.url));
} 