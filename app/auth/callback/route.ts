import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 認証コードをセッションに交換
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 認証完了後、プロフィールページにリダイレクト
  return NextResponse.redirect(new URL('/profile', request.url))
}
