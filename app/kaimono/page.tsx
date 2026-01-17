'use client'

import { ShoppingBag, MapPin, Store, ShoppingCart, BookOpen, Pill, ChevronRight } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

export default function Kaimono() {
  // カテゴリーに応じてアイコンと色を出し分ける設定
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'スーパー': 
        return { icon: <ShoppingCart size={20} />, color: 'bg-blue-500', bgLight: 'bg-blue-50' };
      case 'コンビニ': 
        return { icon: <Store size={20} />, color: 'bg-orange-500', bgLight: 'bg-orange-50' };
      case 'ドラッグ': 
        return { icon: <Pill size={20} />, color: 'bg-pink-500', bgLight: 'bg-pink-50' };
      case '書店': 
        return { icon: <BookOpen size={20} />, color: 'bg-emerald-500', bgLight: 'bg-emerald-50' };
      default: 
        return { icon: <ShoppingBag size={20} />, color: 'bg-gray-500', bgLight: 'bg-gray-50' };
    }
  };

  const shops = [
    { id: 1, name: 'スーパーマーケットX', category: 'スーパー', distance: '500m' },
    { id: 2, name: 'コンビニY', category: 'コンビニ', distance: '200m' },
    { id: 3, name: 'ドラッグストアZ', category: 'ドラッグ', distance: '800m' },
    { id: 4, name: '書店W', category: '書店', distance: '1.2km' },
  ]

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* ヘッダー */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm mb-6 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">買い物</h1>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Shop List near you</p>
      </div>

      {/* お店リスト */}
      <div className="px-6 space-y-4">
        {shops.map((shop) => {
          const theme = getCategoryTheme(shop.category);
          return (
            <div 
              key={shop.id} 
              className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${theme.color} p-2.5 rounded-2xl text-white shadow-lg shadow-gray-200`}>
                    {theme.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-800 leading-tight">{shop.name}</h2>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${theme.bgLight} ${theme.color.replace('bg-', 'text-')}`}>
                      {shop.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
                  <MapPin size={12} fill="currentColor" className="opacity-20" />
                  <span className="ml-1 text-[10px] font-black tabular-nums">{shop.distance}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pl-1">
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed max-w-[80%]">
                  日用品から食品まで、幅広い商品を取り揃えています。
                </p>
                <div className="bg-gray-50 p-2 rounded-full text-gray-300 group-hover:text-orange-400 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 特集バナー風セクション */}
      <div className="px-6 mt-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-black leading-tight">彦根の地場産品特集</h3>
            <p className="text-[10px] font-bold opacity-80 mt-1">銀座商店街でお買い物</p>
          </div>
          <ShoppingBag className="absolute -bottom-2 -right-2 text-white/10" size={100} />
        </div>
      </div>
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}