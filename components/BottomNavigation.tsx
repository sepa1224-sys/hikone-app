'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Utensils, Bus, Home, ShoppingBag, UserCircle } from 'lucide-react'

interface BottomNavigationProps {
  currentView?: 'main' | 'profile'
  onViewChange?: (view: 'main' | 'profile') => void
  onNavigate?: () => void
}

export default function BottomNavigation({ 
  currentView,
  onViewChange,
  onNavigate
}: BottomNavigationProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'

  // 各パスがアクティブかどうかを判定
  const isActive = (href: string) => {
    if (href === '/profile' || href === '/?view=profile') {
      // ホームページでview=profileの場合
      if (isHomePage && currentView === 'profile') {
        return true
      }
      // /profileページの場合
      return pathname === '/profile'
    }
    if (href === '/') {
      // ホームページでview=mainの場合
      return isHomePage && (currentView === 'main' || !currentView)
    }
    // その他のページ（/taberu, /ido, /kaimono）
    return pathname === href
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("会員情報タブクリック - 単純なスイッチとして動作")
    if (isHomePage && onViewChange) {
      // 強制移動ルール：ただのスイッチとして動作
      // 他の条件判定を一切挟まず、ただviewをprofileにするだけ
      onNavigate?.() // チャットを閉じる
      onViewChange('profile') // これだけ実行
    } else {
      // その他のページからは/?view=profileに遷移（app/page.tsxで処理）
      window.location.href = '/?view=profile'
    }
  }

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHomePage && onViewChange) {
      // ホームページの場合はviewステートを変更（絶対命令）
      e.preventDefault()
      onNavigate?.()
      console.log("Home Clicked - calling onViewChange('main')")
      onViewChange('main')
    }
    // それ以外は通常のLink動作
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[100] bg-white border-t border-gray-100 h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
      <div className="relative flex items-center justify-between px-2 h-full max-w-md mx-auto">
        {/* 1. 食べる */}
        <Link 
          href="/taberu" 
          className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
          onClick={onNavigate}
        >
          <Utensils size={20} className={isActive('/taberu') ? 'text-[#ff0033]' : 'text-gray-400'} />
          <span className={`text-[9px] font-bold mt-1 ${isActive('/taberu') ? 'text-[#ff0033]' : 'text-gray-400'}`}>食べる</span>
        </Link>

        {/* 2. 移動 */}
        <Link 
          href="/ido" 
          className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
          onClick={onNavigate}
        >
          <Bus size={20} className={isActive('/ido') ? 'text-[#ff0033]' : 'text-gray-400'} />
          <span className={`text-[9px] font-bold mt-1 ${isActive('/ido') ? 'text-[#ff0033]' : 'text-gray-400'}`}>移動</span>
        </Link>

        {/* 3. ホーム（控えめな盛り上がり） */}
        {isHomePage && onViewChange ? (
          <button
            onClick={handleHomeClick}
            className="relative flex flex-col items-center w-16 h-full"
          >
            {/* 白い土台 */}
            <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
            <div className={`relative -top-3 w-12 h-12 rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10 ${
              isActive('/') ? 'bg-[#ff0033]' : 'bg-gray-400'
            }`}>
              <Home size={20} className="text-white" />
            </div>
            <span className={`relative -top-2 text-[9px] font-black z-10 ${
              isActive('/') ? 'text-[#ff0033]' : 'text-gray-400'
            }`}>ホーム</span>
          </button>
        ) : (
          <Link 
            href="/" 
            className="relative flex flex-col items-center w-16 h-full"
          >
            {/* 白い土台 */}
            <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
            <div className={`relative -top-3 w-12 h-12 rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10 ${
              isActive('/') ? 'bg-[#ff0033]' : 'bg-gray-400'
            }`}>
              <Home size={20} className="text-white" />
            </div>
            <span className={`relative -top-2 text-[9px] font-black z-10 ${
              isActive('/') ? 'text-[#ff0033]' : 'text-gray-400'
            }`}>ホーム</span>
          </Link>
        )}

        {/* 4. 買い物 */}
        <Link 
          href="/kaimono" 
          className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
          onClick={onNavigate}
        >
          <ShoppingBag size={20} className={isActive('/kaimono') ? 'text-[#ff0033]' : 'text-gray-400'} />
          <span className={`text-[9px] font-bold mt-1 ${isActive('/kaimono') ? 'text-[#ff0033]' : 'text-gray-400'}`}>買い物</span>
        </Link>

        {/* 5. 会員情報 */}
        {isHomePage && onViewChange ? (
          <button
            onClick={handleProfileClick}
            className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
          >
            <UserCircle size={20} className={isActive('/profile') ? 'text-[#ff0033]' : 'text-gray-400'} />
            <span className={`text-[9px] font-bold mt-1 ${isActive('/profile') ? 'text-[#ff0033]' : 'text-gray-400'}`}>会員情報</span>
          </button>
        ) : (
          <Link 
            href="/profile" 
            className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
          >
            <UserCircle size={20} className={isActive('/profile') ? 'text-[#ff0033]' : 'text-gray-400'} />
            <span className={`text-[9px] font-bold mt-1 ${isActive('/profile') ? 'text-[#ff0033]' : 'text-gray-400'}`}>会員情報</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
