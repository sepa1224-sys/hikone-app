'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: any | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  
  const initialized = useRef(false)
  const isMountedRef = useRef(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('🔐 [AuthProvider] プロフィール取得エラー:', error)
        }
        return null
      }
      return data
    } catch (err) {
      console.error('🔐 [AuthProvider] プロフィール取得例外:', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    if (initialized.current) return
    initialized.current = true

    const initAuth = async () => {
      console.log('🔐 [AuthProvider] 初期化開始...')
      
      // モバイル環境などで getSession がハングする場合があるため、タイムアウトを設ける
      // タイムアウトを2秒に短縮し、より早くホーム画面へ移行させる
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 2000)
      )

      try {
        const { data: { session: initialSession }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as any
        
        if (error) console.error('🔐 [AuthProvider] セッション取得エラー:', error)

        if (initialSession && isMountedRef.current) {
          setSession(initialSession)
          setUser(initialSession.user)
          const profileData = await fetchProfile(initialSession.user.id)
          if (isMountedRef.current) setProfile(profileData)
        }
      } catch (err) {
        console.error('🔐 [AuthProvider] 初期化例外:', err)
      } finally {
        // 何があってもここでロードを終わらせる
        if (isMountedRef.current) {
          console.log('🔐 [AuthProvider] ロード完了')
          setLoading(false)
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMountedRef.current) return

        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (newSession?.user) {
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            const profileData = await fetchProfile(newSession.user.id)
            if (isMountedRef.current) setProfile(profileData)
          }
        } else {
          setProfile(null)
        }
        // 状態変更後も確実にロードをオフにする
        setLoading(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    const unsubscribePromise = initAuth()

    return () => {
      isMountedRef.current = false
      unsubscribePromise.then(unsubscribe => unsubscribe?.())
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
