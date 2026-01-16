'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, Phone, Clock } from 'lucide-react'

// 地図コンポーネントの読み込み
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
        
        if (error) {
          console.error("Supabase Error:", error)
          return
        }

        if (data) {
          const formattedData = data.map((s: any) => {
            const rawLat = Number(s.latitude);
            const rawLng = Number(s.longitude);

            // 💡 補正ポイント：北東のズレを直すため、南西方向に数値をずらす
            // 0.0004 くらい引くと約40mほど南(下)にピンが移動します
            return {
              ...s,
              latitude: rawLat - 0.0004, 
              longitude: rawLng - 0.0002
            };
          });
          
          setAllShops(formattedData)
          setFilteredShops(formattedData)
        }
      } catch (err) {
        console.error("Fetch Error:", err)
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
      
      {/* 1. 地図レイヤー */}
      <div className="absolute inset-0 z-0">
        <ShopMap shops={filteredShops} />
      </div>

      {/* 2. 上部UI */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="mt-4 px-4 space-y-3">
          <div className="bg-white shadow-lg rounded-full flex items-center p-3 px-4 gap-3 pointer-events-auto border border-gray-100 max-w-md mx-auto">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="お店を検索" className="text-xs font-bold text-gray-800 outline-none w-full bg-transparent" />
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pointer-events-auto pb-2">
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

      {/* 3. 下部リストレイヤー */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-y-auto no-scrollbar">
        <div className="mt-[50vh] min-h-screen bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1) border-t border-gray-100 pointer-events-auto pb-32">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto relative top-3" />
          
          <div className="p-6 pt-10">
            <h2 className="text-lg font-black text-gray-900 mb-6">近くのスポット <span className="text-xs font-bold text-gray-400 ml-2">{filteredShops.length}件</span></h2>

            <div className="space-y-8">
              {filteredShops.map((shop) => (
                <div key={shop.id} className="pb-6 border-b border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-black text-gray-900">{shop.name}</h3>
                    <Heart size={18} className="text-gray-300" />
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} className="text-orange-500" /> {shop.address}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} className="text-gray-400" /> {shop.opening_hours}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={10} className="text-gray-400" /> {shop.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${shop.phone}`} className="flex-1 bg-gray-50 text-gray-900 text-center py-2.5 rounded-xl font-bold text-[10px]">電話</a>
                    {/* 💡 ルート案内リンクも補正後の座標を使うように修正 */}
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`} 
                      target="_blank" 
                      className="flex-1 bg-orange-500 text-white text-center py-2.5 rounded-xl font-bold text-[10px]"
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
      <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}