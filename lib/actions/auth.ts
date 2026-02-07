'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ''

// Admin client
// 環境変数が設定されていない場合にクラッシュしないようにnull許容にする
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export async function loginWithAuth0(accessToken: string, origin: string) {
  try {
    if (!supabaseAdmin) {
      console.error('🚨 [Auth Action] SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
      throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    // 1. Auth0からユーザー情報を取得（トークン検証代わり）
    const userinfoRes = await fetch(`https://${auth0Domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!userinfoRes.ok) {
      throw new Error('Auth0 userinfo fetch failed')
    }

    const userInfo = await userinfoRes.json()
    const { email, name, picture, sub } = userInfo

    if (!email) {
      throw new Error('Email is required from Auth0')
    }

    console.log(`🔐 [Auth Action] Processing login for: ${email}`)

    // 2. ユーザー作成（存在しない場合）
    // パスワードはランダム（ユーザーはパスワードを知る必要がない）
    // email_confirm: true にして、確認メールを飛ばさずに有効化する
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        avatar_url: picture,
        auth0_id: sub
      }
    })

    if (createError) {
      // 既に存在する場合は無視して進む
      // エラーコードやメッセージを確認（Supabaseの実装に依存するが、通常重複エラーは無視してよい）
      console.log('🔐 [Auth Action] User lookup/creation:', createError.message)
    } else {
      console.log('🔐 [Auth Action] Created new user:', newUser.user?.id)
    }

    // 3. マジックリンク生成（これでログインセッションを作る）
    // type: 'magiclink' は、メールを送信せずにリンクだけを生成する
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${origin}/api/auth/callback` // コールバックURLはダミーでも良いが、ハッシュが付く場所
      }
    })

    if (linkError) {
      console.error('Link generation error:', linkError)
      throw linkError
    }

    if (!linkData.properties?.action_link) {
      throw new Error('Failed to generate action link')
    }

    console.log('🔐 [Auth Action] Generated login link. Exchanging for session tokens...')

    // 4. サーバーサイドでリンクを踏んでトークンを取得する
    // verifyエンドポイントを叩くと、302リダイレクトで #access_token=... 付きのURLが返る
    const verifyUrl = linkData.properties.action_link
    const verifyRes = await fetch(verifyUrl, {
      method: 'GET',
      redirect: 'manual' // リダイレクトを追わない
    })

    // リダイレクト先のURL (Locationヘッダー) を取得
    const location = verifyRes.headers.get('Location')
    
    if (!location) {
      console.error('🔐 [Auth Action] Failed to get location header from verify response')
      throw new Error('Failed to verify magic link')
    }

    // Location URLからハッシュパラメータ (#access_token=...) を抽出
    // 例: http://localhost:3000/api/auth/callback#access_token=...&expires_in=...&refresh_token=...
    // 注意: URLのハッシュ部分はサーバーには送信されないが、Locationヘッダーには含まれている
    
    let sessionAccessToken = ''
    let sessionRefreshToken = ''

    try {
      // ハッシュ部分を取り出す
      const hashIndex = location.indexOf('#')
      if (hashIndex !== -1) {
        const hash = location.substring(hashIndex + 1)
        const params = new URLSearchParams(hash)
        sessionAccessToken = params.get('access_token') || ''
        sessionRefreshToken = params.get('refresh_token') || ''
      }
    } catch (e) {
      console.error('🔐 [Auth Action] Failed to parse tokens from location:', e)
    }

    if (!sessionAccessToken || !sessionRefreshToken) {
      console.error('🔐 [Auth Action] Tokens not found in redirect location')
      throw new Error('Failed to retrieve session tokens')
    }

    console.log('🔐 [Auth Action] Session tokens retrieved successfully')

    return { 
      success: true, 
      session: {
        access_token: sessionAccessToken,
        refresh_token: sessionRefreshToken
      }
    }

  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
  }
}
