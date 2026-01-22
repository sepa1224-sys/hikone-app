import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('🔐 [Auth Callback] コールバック受信, code:', code ? '存在' : 'なし')

  if (code) {
    // サーバーサイドでのセッション交換
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
    
    // 認証コードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('🔐 [Auth Callback] セッション交換エラー:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }
    
    console.log('🔐 [Auth Callback] セッション交換成功:', {
      userId: data.session?.user?.id,
      email: data.session?.user?.email,
    })
  }

  // 認証完了後、プロフィールページにリダイレクト
  console.log('🔐 [Auth Callback] プロフィールページへリダイレクト')
  return NextResponse.redirect(new URL('/profile', request.url))
}
