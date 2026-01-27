'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/components/AuthProvider'

// Googleアイコン（SVG）
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  
  // 最新の @supabase/ssr を使用してクライアントを初期化
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // AuthProvider から認証状態を取得
  const { session, loading: authLoading } = useAuth()
  
  const [isLogin, setIsLogin] = useState(true) // true: ログイン, false: 新規登録
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 既にログイン済みの場合はプロフィールページへリダイレクト
  useEffect(() => {
    console.log('🔑 [Login] 認証状態確認:', { authLoading, hasSession: !!session })
    
    if (!authLoading && session) {
      console.log('🔑 [Login] 既にログイン済み → プロフィールへリダイレクト')
      router.push('/profile')
      router.refresh()
    }
  }, [authLoading, session, router])

  // メール/パスワードでのログイン・登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isLogin) {
        console.log('🔑 [Login] メールログイン実行中...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        console.log('🔑 [Login] ログイン成功:', data.session?.user?.email)
        setSuccess('ログインしました！')
        
        // ログイン成功後に /profile へ遷移し、状態を同期するために refresh を実行
        router.push('/profile')
        router.refresh()
      } else {
        console.log('🔑 [Login] 新規登録実行中...')
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setSuccess('確認メールを送信しました。メールをご確認ください。')
      }
    } catch (err: any) {
      console.error('🔑 [Login] エラー:', err.message)
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // Googleでサインイン
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      console.log('🔑 [Login] Googleログイン実行中...')
      // PKCEフローを確実に維持するため、最新の signInWithOAuth を使用
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // PKCEフローは createBrowserClient を使用していれば自動的に適用されます
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('🔑 [Login] Googleログインエラー:', err.message)
      setError(err.message || 'Googleログインに失敗しました')
      setGoogleLoading(false)
    }
  }
  
  // AuthProvider がまだローディング中の場合
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔐</div>
          <p className="font-black text-gray-400">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
          <span className="text-sm font-bold">ホームに戻る</span>
        </Link>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          {/* ロゴ・タイトル */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-3xl">🏯</span>
            </div>
            <h1 className="text-2xl font-black text-gray-800">彦根くらしアプリ</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin ? 'アカウントにログイン' : '新規アカウント作成'}
            </p>
          </div>

          {/* Googleでサインインボタン */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 mb-6"
          >
            {googleLoading ? (
              '接続中...'
            ) : (
              <>
                <GoogleIcon />
                Googleでサインイン
              </>
            )}
          </button>

          {/* 区切り線 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">または</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>

            {/* パスワード */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
                {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {success && (
              <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl text-center">
                {success}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                '処理中...'
              ) : isLogin ? (
                <>
                  <LogIn size={18} /> メールでログイン
                </>
              ) : (
                <>
                  <UserPlus size={18} /> メールで新規登録
                </>
              )}
            </button>
          </form>

          {/* 切り替えリンク */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
              }}
              className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors"
            >
              {isLogin ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方はこちら'}
            </button>
          </div>

          {/* ゲストとして続ける */}
          <div className="text-center mt-4">
            <Link
              href="/"
              className="text-xs font-medium text-gray-400 hover:text-gray-600 underline"
            >
              ログインせずに使う（一部機能制限あり）
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
