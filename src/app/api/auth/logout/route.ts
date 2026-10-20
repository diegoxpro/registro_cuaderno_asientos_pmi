import { NextResponse } from 'next/server';
import { SESSION_COOKIE, PENDING_2FA_COOKIE } from '@/lib/session';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(PENDING_2FA_COOKIE);
  return res;
}
