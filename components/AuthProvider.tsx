'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// 認証コンテキストの型定義
interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

// デフォルト値
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
})

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 認証プロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 [AuthProvider] 初期化開始...')

    // 1. 既存のセッションを復元
    const initSession = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('🔐 [AuthProvider] セッション取得エラー:', error)
        } else {
          console.log('🔐 [AuthProvider] 現在のセッション:', existingSession ? {
            userId: existingSession.user?.id,
            email: existingSession.user?.email,
            expiresAt: existingSession.expires_at,
          } : 'なし')
          
          setSession(existingSession)
          setUser(existingSession?.user ?? null)
        }
      } catch (err) {
        console.error('🔐 [AuthProvider] セッション初期化エラー:', err)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    // 2. 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔐 [AuthProvider] Auth状態変更:', event, newSession ? {
        userId: newSession.user?.id,
        email: newSession.user?.email,
      } : 'セッションなし')

      // 状態を更新
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)

      // イベントごとのログ
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ [AuthProvider] ログイン成功')
          break
        case 'SIGNED_OUT':
          console.log('👋 [AuthProvider] ログアウト')
          break
        case 'TOKEN_REFRESHED':
          console.log('🔄 [AuthProvider] トークン更新')
          break
        case 'USER_UPDATED':
          console.log('📝 [AuthProvider] ユーザー情報更新')
          break
        case 'INITIAL_SESSION':
          console.log('🚀 [AuthProvider] 初期セッション確立')
          break
      }
    })

    // クリーンアップ
    return () => {
      console.log('🔐 [AuthProvider] クリーンアップ')
      subscription.unsubscribe()
    }
  }, [])

  // ログアウト関数
  const signOut = async () => {
    console.log('🔐 [AuthProvider] ログアウト処理開始...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('🔐 [AuthProvider] ログアウトエラー:', error)
    } else {
      console.log('✅ [AuthProvider] ログアウト完了')
    }
  }

  // デバッグ: ページ遷移時にセッション状態を確認
  useEffect(() => {
    if (!loading) {
      console.log('🔐 [AuthProvider] 現在の認証状態:', {
        isLoggedIn: !!session,
        userId: user?.id,
        email: user?.email,
      })
    }
  }, [session, user, loading])

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
