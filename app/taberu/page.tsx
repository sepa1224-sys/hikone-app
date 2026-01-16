'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop, isShopOpen } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, CheckCircle2, X, Clock, Phone, UtensilsCrossed } from 'lucide-react'

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
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)

  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        const { data } = await supabase.from('shops').select('*')
        if (data) {
          let formattedData = data.map((s: any) => ({
            ...s,
            latitude: Number(s.latitude), 
            longitude: Number(s.longitude)
          }))
          formattedData.sort((a, b) => {
            if (a.name.includes('せんなり亭')) return -1;
            if (b.name.includes('せんなり亭')) return 1;
            return 0;
          });
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
    let result = [...allShops]
    if (selectedCategory) result = result.filter(s => s.category === selectedCategory)
    if (searchQuery) result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (onlyOpen) result = result.filter(s => isShopOpen(s.opening_hours))
    setFilteredShops(result)
  }, [selectedCategory, onlyOpen, searchQuery, allShops])

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">読み込み中...</div>

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden relative">
      
      {/* 1. 固定ヘッダー */}
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

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white pb-24">
        
        {/* 2. 地図エリア */}
        <div className="w-full h-[50vh] relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ShopMap shops={filteredShops} />
          </div>
          <div className="absolute top-4 inset-x-0 z-50 pointer-events-none">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pl-4 pr-4 py-1 pointer-events-auto">
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
        <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 min-h-[50vh]">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4" />
          <div className="px-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">Nearby Spots</h2>
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">{filteredShops.length}件</span>
            </div>
            <div className="grid gap-6">
              {filteredShops.map((shop) => (
                <div 
                  key={shop.id} 
                  onClick={() => setSelectedShop(shop)}
                  className="cursor-pointer overflow-hidden bg-white rounded-[2rem] border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="w-full h-44 bg-gray-100 relative">
                    {shop.image_url ? (
                      <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">NO IMAGE</div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest">
                      {shop.category}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-md font-extrabold text-gray-900 leading-tight">{shop.name}</h3>
                      <Heart size={18} className="text-gray-300" />
                    </div>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin size={10} className="text-orange-500" /> {shop.address}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {shop.opening_hours}
                      </span>
                      <span className="text-gray-900">{shop.price_range || '¥ ---'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 詳細パネル（selectedShopがある時だけ表示） */}
      {selectedShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[1000]" onClick={() => setSelectedShop(null)} />
          <div className="fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[3rem] h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" onClick={() => setSelectedShop(null)} />
              <button onClick={() => setSelectedShop(null)} className="absolute right-6 top-4 bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
            </div>
            <div className="px-6 pb-40">
              <div className="w-full h-64 rounded-[2.5rem] overflow-hidden mb-6 shadow-lg">
                <img src={selectedShop.image_url} className="w-full h-full object-cover" alt={selectedShop.name} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">{selectedShop.name}</h2>
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">{selectedShop.category}</span>
                <span className="text-gray-900 font-black text-sm">{selectedShop.price_range}</span>
              </div>
              <div className="grid gap-4 bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
                <div className="flex items-start gap-3 text-sm font-bold text-gray-600"><MapPin size={18} className="text-orange-500 shrink-0" /> {selectedShop.address}</div>
                <div className="flex items-center gap-3 text-sm font-bold text-gray-600"><Clock size={18} className="text-orange-500 shrink-0" /> {selectedShop.opening_hours}</div>
                <a href={`tel:${selectedShop.phone}`} className="flex items-center gap-3 text-sm font-black text-blue-600"><Phone size={18} className="shrink-0" /> {selectedShop.phone}</a>
              </div>
              <h3 className="text-xl font-black mb-5 italic flex items-center gap-2"><UtensilsCrossed size={22} className="text-orange-500" /> Recommendation</h3>
              <div className="grid gap-4">
                {selectedShop.menu_items?.map((item, i) => {
                  const [name, price, ...imgParts] = item.split(':');
                  const img = imgParts.join(':');
                  return (
                    <div key={i} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm items-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                        {img ? <img src={img} className="w-full h-full object-cover" alt={name} /> : <div className="text-[10px] text-gray-300 font-bold p-4">No Image</div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-800 mb-1">{name}</p>
                        <p className="text-lg font-black text-orange-600"><span className="text-[10px]">¥</span>{Number(price).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${selectedShop.latitude},${selectedShop.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-10 flex items-center justify-center gap-2 w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">
                <MapPin size={20} /> ここに行く
              </a>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-top.leaflet-left { top: 12px !important; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-in.slide-in-from-bottom { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}