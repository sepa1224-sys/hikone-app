'use client'

import { Home, Utensils, Train, ShoppingBag, Newspaper } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { name: 'ホーム', href: '/', icon: <Home size={20} /> },
    { name: '食べる', href: '/taberu', icon: <Utensils size={20} /> },
    { name: '移動', href: '/ido', icon: <Train size={20} /> },
    { name: '買い物', href: '/kaimono', icon: <ShoppingBag size={20} /> }, // ここを /kaimono に修正しました
    { name: 'ニュース', href: '/news', icon: <Newspaper size={20} /> },
  ]

  return (
    <div className="fixed bottom-0 inset-x-0 z-[500] bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 pt-3 pb-8">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          // 現在のページと一致しているかチェック
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
                isActive ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <div className={`${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}