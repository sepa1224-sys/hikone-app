'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, Phone, Clock } from 'lucide-react'

const ShopMap = dynamic(() => import('@/components/ShopMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">地図を読み込み中...</div>,
})

const CATEGORIES = [
  { id: 'カフェ', name: 'カフェ', icon: <Coffee size={14} />, color: 'bg-orange-100 text-orange-600' },
  { id: '居酒屋', name: '居酒屋', icon: <Beer size={14} />, color: 'bg-yellow-100 text-yellow-600' },
  { id: '和食', name: '和食', icon: <Store size={14} />, color: 'bg-emerald-100 text-emerald-600' },
]

export default function Taberu() {
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('shops').select('*')
        if (data) {
          const formattedData = data.map((s: any) => ({
            ...s,
            latitude: Number(s.latitude) - 0.0004, 
            longitude: Number(s.longitude) - 0.0002
          }))
          setAllShops(formattedData)
          setFilteredShops(formattedData)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchShops()
  }, [])

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">読み込み中...</div>

  return (
    // 💡 全体をスクロール可能なコンテナにする
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden no-scrollbar bg-gray-50">
      
      {/* 1. 地図レイヤー (画面に固定) */}
      <div className="fixed inset-0 z-0 h-screen w-full">
        <ShopMap shops={filteredShops} />
      </div>

      {/* 2. 上部UI (地図の上でクリックできるように z-40) */}
      <div className="sticky top-0 z-40 p-4 pointer-events-none">
        <div className="space-y-3 max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center p-3 px-4 gap-3 border border-white">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="お店を検索" className="text-xs font-bold outline-none w-full bg-transparent" />
          </div>
        </div>
      </div>

      {/* 3. リストレイヤー (地図の上に重なるスクロール可能な中身) */}
      <div className="relative z-10 w-full pointer-events-none">
        {/* 地図を見せるための透明な巨大な隙間 */}
        <div className="h-[60vh] w-full" />

        {/* 実際の白いカード部分 (ここから pointer-events-auto) */}
        <div className="min-h-screen bg-white rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] pointer-events-auto pb-32 px-6">
          {/* 引き出しのバー */}
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto py-3 mb-4 mt-2" />
          
          <h2 className="text-xl font-black text-gray-900 mb-8 italic tracking-tighter">Nearby Spots</h2>

          <div className="grid gap-6">
            {filteredShops.map((shop) => (
              <div key={shop.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-md font-extrabold text-gray-900">{shop.name}</h3>
                  <Heart size={18} className="text-gray-300" />
                </div>
                
                <div className="space-y-2 mb-6 text-[11px] text-gray-500">
                  <p className="flex items-center gap-2"><MapPin size={12} className="text-orange-500" /> {shop.address}</p>
                  <p className="flex items-center gap-2"><Clock size={12} /> {shop.opening_hours}</p>
                </div>

                <div className="flex gap-3">
                  <a href={`tel:${shop.phone}`} className="flex-1 bg-gray-50 text-gray-900 text-center py-3.5 rounded-2xl font-bold text-xs">電話</a>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude + 0.0004},${shop.longitude + 0.0002}`} 
                    target="_blank" 
                    className="flex-1 bg-orange-500 text-white text-center py-3.5 rounded-2xl font-bold text-xs shadow-md"
                  >
                    ルート
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}