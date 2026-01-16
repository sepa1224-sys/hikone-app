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
  { id: 'イタリアン', name: 'イタリアン', icon: <Pizza size={14} />, color: 'bg-red-100 text-red-600' },
  { id: '焼肉', name: '焼肉', icon: <Utensils size={14} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'スイーツ', name: 'スイーツ', icon: <IceCream size={14} />, color: 'bg-pink-100 text-pink-600' },
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

  useEffect(() => {
    let result = allShops
    if (selectedCategory) {
      result = allShops.filter(s => s.category === selectedCategory)
    }
    setFilteredShops(result)
  }, [selectedCategory, allShops])

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">読み込み中...</div>

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden">
      
      {/* 1. 地図：背面 (z-0) - 地図のみ操作可能 */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <ShopMap shops={filteredShops} />
      </div>

      {/* 2. 上部UI：最前面 (z-50) に固定 - 常に画面上部に表示 */}
      <div className="fixed top-0 inset-x-0 z-50 p-4 pointer-events-none">
        <div className="max-w-md mx-auto space-y-3">
          {/* 検索バー */}
          <div className="bg-white shadow-xl rounded-full flex items-center p-3 px-4 gap-3 border border-gray-100 pointer-events-auto">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="お店を検索" className="text-xs font-bold outline-none w-full bg-transparent text-gray-800" />
          </div>
          
          {/* ジャンルタブ */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 pointer-events-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 p-1 pr-3 rounded-full transition-all shrink-0 border ${
                  selectedCategory === cat.id ? 'bg-orange-500 text-white shadow-md border-orange-600' : 'bg-white/95 text-gray-700 shadow-sm border-gray-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${selectedCategory === cat.id ? 'bg-white/20' : cat.color}`}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-black">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. レストランリスト：中間層 (z-10) - スクロール可能 */}
      <div className="absolute inset-0 z-10 pt-[120px]">
        {/* 地図を触るための余白 - この部分は地図を操作可能にする */}
        <div className="h-[45vh] w-full pointer-events-none" />

        {/* リスト本体 - スクロール可能で操作可能 */}
        <div className="overflow-y-auto h-[calc(100vh-45vh-120px)] no-scrollbar pointer-events-auto">
          <div className="bg-white rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border-t border-gray-100 pb-32">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
            
            <div className="px-6">
              <h2 className="text-xl font-black text-gray-900 mb-8 italic tracking-tighter">Nearby Spots</h2>
              <div className="grid gap-6">
                {filteredShops.map((shop) => (
                  <div key={shop.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 active:scale-[0.98] transition-all">
                    <h3 className="text-md font-extrabold text-gray-900 mb-1">{shop.name}</h3>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-4">
                      <MapPin size={10} className="text-orange-500" /> {shop.address}
                    </p>
                    <div className="flex gap-2">
                      <a href={`tel:${shop.phone}`} className="flex-1 bg-white text-gray-900 text-center py-3 rounded-2xl font-bold text-[10px] border border-gray-200">電話</a>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude + 0.0004},${shop.longitude + 0.0002}`} target="_blank" className="flex-1 bg-orange-500 text-white text-center py-3 rounded-2xl font-bold text-[10px]">ルート</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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