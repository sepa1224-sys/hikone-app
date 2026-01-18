'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Utensils, Bus, Home, LayoutGrid, UserCircle } from 'lucide-react'

interface BottomNavigationProps {
  onNavigate?: () => void
}

// ナビゲーション項目の定義（条件分岐なし、全員に表示）
const NAV_ITEMS = [
  { href: '/taberu', label: '食べる', icon: Utensils },
  { href: '/ido', label: '移動', icon: Bus },
  { href: '/', label: 'ホーム', icon: Home, isCenter: true },
  { href: '/living', label: '暮らし', icon: LayoutGrid },
  { href: '/profile', label: '会員情報', icon: UserCircle },
]

/**
 * 下部ナビゲーションバー
 * 5つのタブ: 食べる、移動、ホーム、暮らし、会員情報
 * 条件分岐なし - 全てのユーザーに全項目を表示
 */
export default function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-100 h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
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
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
              onClick={onNavigate}
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
  )
}
