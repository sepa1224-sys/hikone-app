'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop } from '@/lib/supabase'
import ShopFilters from '@/components/ShopFilters'
import ShopList from '@/components/ShopList'

const ShopMap = dynamic(() => import('@/components/ShopMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
      地図を読み込み中...
    </div>
  ),
})

export default function Taberu() {
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [hideClosed, setHideClosed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('shops').select('*')
        if (error) {
          console.error('取得失敗:', error.message)
        } else {
          const shopsData = data || []
          setAllShops(shopsData)
          setFilteredShops(shopsData)
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
    setSelectedShopId(shop.id)
    const element = document.getElementById(`shop-${shop.id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (loading) {
    return <div className="p-10 text-center">読み込み中...</div>
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">たべる</h1>
      <div className="mb-6">
        <ShopMap
          shops={filteredShops}
          selectedShopId={selectedShopId}
          onShopClick={handleShopClick}
        />
      </div>
      <ShopFilters
        shops={allShops}
        selectedCategory={selectedCategory}
        showOpenOnly={showOpenOnly}
        hideClosed={hideClosed}
        onCategoryChange={setSelectedCategory}
        onShowOpenOnlyChange={setShowOpenOnly}
        onHideClosedChange={setHideClosed}
      />
      <div className="mb-4 text-sm font-bold text-blue-600 bg-blue-50 p-2 rounded">
        ✅ 取得できた数: {allShops.length}件 / 表示中の数: {filteredShops.length}件
      </div>
      <ShopList
        shops={filteredShops}
        selectedShopId={selectedShopId}
        onShopClick={handleShopClick}
      />
    </div>
  )
}