import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/profile'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // path: '/' を入れることで、アプリ全体でCookieを使えるようにします
            cookieStore.set({ name, value, ...options, path: '/' })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options, path: '/' })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 成功時、一瞬待機させるようなリダイレクト（確実にCookieを焼くため）
      const response = NextResponse.redirect(`${origin}${next}`)
      return response
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
