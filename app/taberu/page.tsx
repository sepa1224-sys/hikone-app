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
  { id: 'イタリアン', name: 'パスタ', icon: <Pizza size={14} />, color: 'bg-red-100 text-red-600' },
  { id: '焼肉', name: '焼肉', icon: <Utensils size={14} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'スイーツ', name: 'スイーツ', icon: <IceCream size={14} />, color: 'bg-pink-100 text-pink-600' },
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
        if (error) throw error
        if (data) {
          const formattedData = data.map((s: any) => ({
            ...s,
            latitude: Number(s.latitude) - 0.0004, 
            longitude: Number(s.longitude) - 0.0002
          }))
          setAllShops(formattedData)
          setFilteredShops(formattedData)
        }
      } catch (err) {
        console.error(err)
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
    <div className="relative h-screen w-full bg-white overflow-hidden flex flex-col">
      
      {/* 1. 地図レイヤー (背景固定) */}
      <div className="fixed inset-0 z-0">
        <ShopMap shops={filteredShops} />
      </div>

      {/* 2. 上部UI (検索・カテゴリー) */}
      <div className="relative z-30 pointer-events-none p-4">
        <div className="space-y-3 max-w-md mx-auto pointer-events-auto">
          <div className="bg-white shadow-lg rounded-full flex items-center p-3 px-4 gap-3 border border-gray-100">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="お店を検索" className="text-xs font-bold text-gray-800 outline-none w-full bg-transparent" />
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 p-1 pr-3 rounded-full transition-all shrink-0 border ${
                  selectedCategory === cat.id ? 'bg-orange-500 text-white shadow-md' : 'bg-white/95 text-gray-700 shadow-sm'
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

      {/* 3. 下部リストレイヤー (スクロールエリア) */}
      <div className="relative z-20 flex-1 overflow-y-auto no-scrollbar pointer-events-none">
        {/* 地図を触らせるための透明な空間 */}
        <div className="h-[40vh] w-full" />

        {/* 白いリスト本体 */}
        <div className="min-h-screen bg-white rounded-t-[2.5rem] shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 pointer-events-auto pb-32">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
          
          <div className="px-6 py-4">
            <h2 className="text-xl font-black text-gray-900 mb-6 italic tracking-tighter">Nearby Spots</h2>

            <div className="grid gap-6">
              {filteredShops.map((shop) => (
                <div key={shop.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-md font-extrabold text-gray-900">{shop.name}</h3>
                    <Heart size={18} className="text-gray-300" />
                  </div>
                  
                  <div className="space-y-2 mb-5 text-[11px] text-gray-500 font-medium">
                    <p className="flex items-center gap-2"><MapPin size={12} className="text-orange-500" /> {shop.address}</p>
                    <p className="flex items-center gap-2"><Clock size={12} /> {shop.opening_hours}</p>
                    <p className="flex items-center gap-2"><Phone size={12} /> {shop.phone}</p>
                  </div>

                  <div className="flex gap-3">
                    <a href={`tel:${shop.phone}`} className="flex-1 bg-white border border-gray-200 text-gray-900 text-center py-3 rounded-2xl font-bold text-xs shadow-sm">電話</a>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude + 0.0004},${shop.longitude + 0.0002}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 bg-orange-500 text-white text-center py-3 rounded-2xl font-bold text-xs shadow-md"
                    >
                      ルート
                    </a>
                  </div>
                </div>
              ))}
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