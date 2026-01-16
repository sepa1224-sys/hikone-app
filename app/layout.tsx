import './globals.css'
import { Home as HomeIcon, Utensils, Bus, ShoppingBag, Newspaper } from 'lucide-react'
import Link from 'next/link'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 pb-20"> {/* バーの高さ分、下に余白を空ける */}
        
        {/* メインコンテンツ */}
        <main>{children}</main>

        {/* --- ★ 全ページ共通：最前面のPayPay風ナビゲーションバー ★ --- */}
        <nav className="fixed bottom-0 inset-x-0 z-[9999] bg-white border-t border-gray-100 h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <div className="relative flex items-center justify-between px-2 h-full max-w-md mx-auto">
            
            {/* 1. 食べる */}
            <Link href="/taberu" className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
              <Utensils size={20} className="text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 mt-1">食べる</span>
            </Link>

            {/* 2. 移動 */}
            <Link href="/ido" className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
              <Bus size={20} className="text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 mt-1">移動</span>
            </Link>

            {/* 3. ホーム（控えめな盛り上がり） */}
            <Link href="/" className="relative flex flex-col items-center w-16 h-full">
              {/* 白い土台 */}
              <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
              <div className="relative -top-3 w-12 h-12 bg-[#ff0033] rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10">
                <HomeIcon size={20} className="text-white" />
              </div>
              <span className="relative -top-2 text-[9px] font-black text-[#ff0033] z-10">ホーム</span>
            </Link>

            {/* 4. 買い物 */}
            <Link href="/kaimono" className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
              <ShoppingBag size={20} className="text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 mt-1">買い物</span>
            </Link>

            {/* 5. ニュース */}
            <Link href="/news" className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
              <Newspaper size={20} className="text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 mt-1">ニュース</span>
            </Link>

          </div>
        </nav>
      </body>
    </html>
  )
}