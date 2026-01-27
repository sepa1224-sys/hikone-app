'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
  
  // 初期化フラグとサブスクリプション参照
  const initialized = useRef(false) // 二重起動の完全ガード
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const isMountedRef = useRef(true)
  const isInitSessionRunningRef = useRef(false) // initSessionの実行中フラグ

  useEffect(() => {
    // 二重起動の完全ガード: 1回しか実行されないようにする
    if (initialized.current) {
      return
    }
    initialized.current = true

    // アンマウント後のステート更新を防ぐためのフラグ
    let isMounted = true

    console.log('🔐 [AuthProvider] 初期化開始...')
    isMountedRef.current = true

    // 1. 既存のセッションを復元
    const initSession = async () => {
      // 既に実行中の場合はスキップ（2回同時実行を防ぐ）
      if (isInitSessionRunningRef.current) {
        return
      }

      // アンマウント済みの場合は処理を中断
      if (!isMounted || !isMountedRef.current) {
        return
      }

      isInitSessionRunningRef.current = true

      try {
        // タイムアウトの導入: Reactの起動ラッシュを避けるため100ms待機
        await new Promise(resolve => setTimeout(resolve, 100))

        // アンマウント済みの場合は処理を中断
        if (!isMounted || !isMountedRef.current) {
          return
        }

        const { data: { session: existingSession }, error } = await supabase.auth.getSession()
        
        // アンマウント済みの場合は状態更新をスキップ
        if (!isMounted || !isMountedRef.current) {
          return
        }
        
        if (error) {
          // エラーの握りつぶし: AbortErrorまたはAuthRetryableFetchErrorの場合はconsole.warnで流す
          if (error.name === 'AbortError' || error.name === 'AuthRetryableFetchError' || error.message?.includes('aborted') || error.message?.includes('retryable')) {
            console.warn('🔐 [AuthProvider] セッション取得エラー（無視）:', error.name || error.message)
            return
          }
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
      } catch (err: any) {
        // エラーの握りつぶし: AbortErrorまたはAuthRetryableFetchErrorの場合はconsole.warnで流す
        if (err?.name === 'AbortError' || err?.name === 'AuthRetryableFetchError' || err?.message?.includes('aborted') || err?.message?.includes('retryable')) {
          console.warn('🔐 [AuthProvider] セッション取得エラー（無視）:', err.name || err.message)
          return
        }
        console.error('🔐 [AuthProvider] セッション初期化エラー:', err)
      } finally {
        isInitSessionRunningRef.current = false
        if (isMounted && isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    // initSessionを実行（isMountedフラグでガード）
    if (isMounted && isMountedRef.current) {
      initSession()
    }

    // 2. 認証状態の変更を監視
    let subscription: { unsubscribe: () => void } | null = null
    
    try {
      const authStateChangeResult = supabase.auth.onAuthStateChange((event, newSession) => {
        // アンマウント済みの場合は状態更新をスキップ
        if (!isMounted || !isMountedRef.current) {
          console.log('🔐 [AuthProvider] アンマウント済みのためAuth状態変更をスキップ')
          return
        }

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

      subscription = authStateChangeResult.data.subscription
      subscriptionRef.current = subscription
    } catch (err: any) {
      // エラーの握りつぶし: AbortErrorまたはAuthRetryableFetchErrorの場合はconsole.warnで流す
      if (err?.name === 'AbortError' || err?.name === 'AuthRetryableFetchError' || err?.message?.includes('aborted') || err?.message?.includes('retryable')) {
        console.warn('🔐 [AuthProvider] onAuthStateChange設定エラー（無視）:', err.name || err.message)
      } else {
        console.error('🔐 [AuthProvider] onAuthStateChange設定エラー:', err)
      }
    }

    // クリーンアップ
    return () => {
      console.log('🔐 [AuthProvider] クリーンアップ')
      isMounted = false // アンマウントフラグをfalseに設定
      isMountedRef.current = false
      isInitSessionRunningRef.current = false
      
      // サブスクリプションを確実に解除
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe()
          subscriptionRef.current = null
          console.log('🔐 [AuthProvider] サブスクリプション解除完了')
        } catch (err: any) {
          // エラーの握りつぶし: AbortErrorまたはAuthRetryableFetchErrorの場合はconsole.warnで流す
          if (err?.name === 'AbortError' || err?.name === 'AuthRetryableFetchError' || err?.message?.includes('aborted') || err?.message?.includes('retryable')) {
            console.warn('🔐 [AuthProvider] サブスクリプション解除エラー（無視）:', err.name || err.message)
          } else {
            console.error('🔐 [AuthProvider] サブスクリプション解除エラー:', err)
          }
        }
      }
      
      // 初期化フラグをリセット（再マウント時に再初期化可能にする）
      initialized.current = false
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
