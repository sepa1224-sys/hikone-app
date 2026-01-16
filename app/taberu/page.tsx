'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import ShopFilters from '@/components/ShopFilters'
import ShopList from '@/components/ShopList'
import { X, MapPin, Navigation } from 'lucide-react'

const ShopMap = dynamic(() => import('@/components/ShopMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[30vh] bg-gray-100 flex items-center justify-center font-bold text-gray-400">Loading...</div>,
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
        if (error) throw error
        const foodOnly = (data || []).filter(s => s.category !== '買い物')
        setAllShops(foodOnly)
        setFilteredShops(foodOnly)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchShops()
  }, [])

  useEffect(() => {
    if (!selectedCategory) {
      setFilteredShops(allShops)
    } else {
      setFilteredShops(allShops.filter(s => s.category === selectedCategory))
    }
  }, [selectedCategory, allShops])

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">Loading...</div>

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      <div className="h-14 p-4 bg-white border-b z-20 flex justify-between items-center shrink-0">
        <h1 className="text-lg font-black text-gray-900">彦根でたべる</h1>
        <div className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">{filteredShops.length}件</div>
      </div>

      <div className="h-[30vh] w-full relative shrink-0 border-b z-10">
        <ShopMap shops={filteredShops} selectedShopId={selectedShop?.id} onShopClick={(shop) => setSelectedShop(shop)} />
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 pb-32 relative z-0">
        <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-1 mb-1" />
          <ShopFilters shops={allShops} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        </div>
        <div className="p-4">
          <ShopList shops={filteredShops} selectedShopId={selectedShop?.id} onShopClick={(shop) => setSelectedShop(shop)} />
        </div>
      </div>

      {selectedShop && (
        <div className="fixed bottom-24 left-4 right-4 z-[2001]">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full mb-1 inline-block uppercase">{selectedShop.category}</span>
                <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedShop.name}</h2>
                <div className="flex items-center gap-1 text-gray-500 text-[10px] mt-1">
                  <MapPin size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">{selectedShop.address}</span>
                </div>
              </div>
              <button onClick={() => setSelectedShop(null)} className="bg-gray-100 text-gray-400 p-2 rounded-full"><X size={20} /></button>
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedShop.address)}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 text-white text-center py-4 rounded-2xl font-bold text-sm shadow-lg">道案内を開始</a>
          </div>
        </div>
      )}
    </div>
  )
}