'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import ShopFilters from '@/components/ShopFilters'
import ShopList from '@/components/ShopList'
import { X, MapPin, Navigation } from 'lucide-react'

// 地図コンポーネントを動的に読み込み
const ShopMap = dynamic(() => import('@/components/ShopMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold">地図を準備中...</div>,
})

export default function Taberu() {
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('shops').select('*')
        if (error) {
          console.error('取得失敗:', error.message)
        } else {
          setAllShops(data || [])
          setFilteredShops(data || [])
        }
      } catch (err) {
        console.error('通信エラー:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchShops()
  }, [])

  useEffect(() => {
    let result = [...allShops]
    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory)
    }
    setFilteredShops(result)
  }, [allShops, selectedCategory])

  const handleShopClick = (shop: Shop) => {
    setSelectedShop(shop)
    const element = document.getElementById(`shop-${shop.id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // ローディング中の表示
  if (loading) {
    return <div className="p-10 text-center font-bold text-blue-600">彦根のグルメを読み込み中...</div>
  }

  // メインの表示
  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* 1. ヘッダー */}
      <div className="p-4 bg-white border-b z-20 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-gray-900">彦根でたべる</h1>
        <div className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
          {filteredShops.length}件表示中
        </div>
      </div>

      {/* 2. マップエリア */}
      <div className="h-[40vh] w-full relative shrink-0 border-b z-10">
        <ShopMap
          shops={filteredShops}
          selectedShopId={selectedShop?.id}
          onShopClick={handleShopClick}
        />
      </div>

      {/* 3. リストエリア */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-32">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b">
          <ShopFilters
            shops={allShops}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        <div className="p-4">
          <ShopList
            shops={filteredShops}
            selectedShopId={selectedShop?.id}
            onShopClick={handleShopClick}
          />
        </div>
      </div>

      {/* 4. 詳細カード */}
      {selectedShop && (
        <div className="fixed bottom-24 left-4 right-4 z-[2001] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">
                      {selectedShop.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedShop.name}</h2>
                </div>
                <button 
                  onClick={() => setSelectedShop(null)} 
                  className="bg-gray-100 text-gray-400 p-2 rounded-full active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500 text-xs mb-4">
                <MapPin size={14} className="shrink-0 text-blue-500" />
                <span className="truncate">{selectedShop.address}</span>
              </div>

              <div className="flex gap-2">
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedShop.address)}`}
                  target="_blank"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation size={18} /> 道案内を開始
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}