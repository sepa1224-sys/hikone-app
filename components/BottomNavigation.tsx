'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Utensils, Bus, Home, LayoutGrid, UserCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface BottomNavigationProps {
  onNavigate?: () => void
}

// =====================================================
// ナビゲーション項目の定義
// =====================================================
const NAV_ITEMS = [
  { href: '/taberu', label: '食べる', icon: Utensils },
  { href: '/ido', label: '移動', icon: Bus },
  { href: '/', label: 'ホーム', icon: Home, isCenter: true },
  { href: '/living', label: '暮らし', icon: LayoutGrid },
  { href: '/profile', label: '会員情報', icon: UserCircle, requiresAuth: true },
]

/**
 * 下部ナビゲーションバー
 * 5つのタブ: 食べる、移動、ホーム、暮らし、会員情報
 * 「会員情報」は未ログインの場合 /login に遷移
 */
export default function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  // ログイン状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isActive = (href: string) => pathname === href

  // 会員情報ボタンのクリックハンドラ
  const handleProfileClick = (e: React.MouseEvent, item: typeof NAV_ITEMS[0]) => {
    if (item.requiresAuth && !isLoggedIn) {
      e.preventDefault()
      onNavigate?.()
      router.push('/login')
    } else {
      onNavigate?.()
    }
  }

  return (
    <>
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          height: '64px',
          backgroundColor: 'white',
          borderTop: '1px solid #f3f4f6',
          boxShadow: '0 -5px 15px rgba(0,0,0,0.05)',
        }}
      >
        <div className="relative flex items-center justify-between px-2 h-full max-w-md mx-auto">
          
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            
            // ホーム（中央）は特別なデザイン
            if (item.isCenter) {
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className="relative flex flex-col items-center w-16 h-full"
                  onClick={onNavigate}
                >
                  <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
                  <div className="relative -top-3 w-12 h-12 rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10 bg-[#FF0000]">
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="relative -top-2 text-[9px] font-black z-10 text-[#FF0000]">{item.label}</span>
                </Link>
              )
            }
            
            // 通常のナビゲーションアイテム
            // 「会員情報」は認証状態に応じて遷移先を制御
            return (
              <Link 
                key={item.href}
                href={item.requiresAuth && !isLoggedIn ? '/login' : item.href}
                className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
                onClick={(e) => handleProfileClick(e, item)}
              >
                <Icon size={20} className={isActive(item.href) ? 'text-[#ff0033]' : 'text-gray-400'} />
                <span className={`text-[9px] font-bold mt-1 ${isActive(item.href) ? 'text-[#ff0033]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

        </div>
      </nav>
    </>
  )
}
