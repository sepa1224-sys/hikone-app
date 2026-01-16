'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, CheckCircle2 } from 'lucide-react'

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
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        const { data } = await supabase.from('shops').select('*')
        if (data) {
          const formattedData = data.map((s: any) => ({
            ...s,
            latitude: Number(s.latitude) - 0.0005, 
            longitude: Number(s.longitude) - 0.0003
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
    if (selectedCategory) result = result.filter(s => s.category === selectedCategory)
    if (searchQuery) result = result.filter(s => s.name.includes(searchQuery))
    setFilteredShops(result)
  }, [selectedCategory, onlyOpen, searchQuery, allShops])

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">読み込み中...</div>

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
      
      {/* 1. 固定ヘッダー（検索と営業切り替え） */}
      <div className="z-[100] bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto space-y-3">
          <div className="bg-gray-50 rounded-full flex items-center p-2.5 px-4 gap-3 border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="お店を検索" 
              className="text-xs font-bold outline-none w-full bg-transparent text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setOnlyOpen(false)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${
                !onlyOpen ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              全て
            </button>
            <button 
              onClick={() => setOnlyOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black border transition-all ${
                onlyOpen ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <CheckCircle2 size={12} /> 営業中のみ
            </button>
          </div>
        </div>
      </div>

      {/* 2. スクロールエリア */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
        
        {/* 地図エリア */}
        <div className="w-full h-[55vh] relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ShopMap shops={filteredShops} />
          </div>

          {/* 💡 ジャンルボタン：地図の上に絶対配置で浮かせる */}
          <div className="absolute top-4 inset-x-0 z-50 pointer-events-none">
            <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 py-1 pointer-events-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`flex items-center gap-1.5 p-1 pr-3 rounded-full transition-all shrink-0 border-2 shadow-xl ${
                    selectedCategory === cat.id 
                      ? 'bg-orange-500 text-white border-orange-400 scale-105' 
                      : 'bg-white/95 backdrop-blur-md text-gray-700 border-white'
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

        {/* 3. レストランリスト */}
        <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 pb-32 min-h-[50vh]">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4" />
          
          <div className="px-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">Nearby Spots</h2>
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">{filteredShops.length}件</span>
            </div>

            <div className="grid gap-6">
              {filteredShops.map((shop) => (
                <div key={shop.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-extrabold text-gray-900">{shop.name}</h3>
                    <Heart size={18} className="text-gray-300" />
                  </div>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-4">
                    <MapPin size={10} className="text-orange-500" /> {shop.address}
                  </p>
                  <div className="flex gap-2">
                    <a href={`tel:${shop.phone}`} className="flex-1 bg-white text-gray-900 text-center py-3 rounded-2xl font-bold text-[10px] border border-gray-200 shadow-sm">電話</a>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude + 0.0005},${shop.longitude + 0.0003}`} 
                      target="_blank" 
                      className="flex-1 bg-orange-500 text-white text-center py-3 rounded-2xl font-bold text-[10px] shadow-md"
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