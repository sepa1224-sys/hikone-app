'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'
import { Navigation } from 'lucide-react'

// ブラウザ環境でのみLeafletのアイコンを設定
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface ShopMapProps {
  shops: Shop[]
  selectedShopId?: any // 型エラー防止のため any に変更
  onShopClick?: (shop: Shop) => void
}

function LocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap()
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          map.setView([latitude, longitude], 15)
          onLocate(latitude, longitude)
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error)
          alert('位置情報の取得に失敗しました')
        }
      )
    } else {
      alert('このブラウザは位置情報をサポートしていません')
    }
  }

  return (
    <button
      onClick={handleLocate}
      className="absolute top-4 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
      aria-label="現在地を表示"
    >
      <Navigation className="w-5 h-5 text-blue-600" />
    </button>
  )
}

export default function ShopMap({ shops, selectedShopId, onShopClick }: ShopMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [mounted, setMounted] = useState(false)

  const defaultCenter: [number, number] = [35.271, 136.257]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
    }
  }, [])

  const shopsWithLocation = (shops || []).filter((shop) => {
    const lat = parseFloat(String(shop.latitude))
    const lng = parseFloat(String(shop.longitude))
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
  })

  useEffect(() => {
    if (selectedShopId && mapRef.current && mounted) {
      // String同士で比較して型エラーを回避
      const selectedShop = shopsWithLocation.find((s) => String(s.id) === String(selectedShopId))
      if (selectedShop) {
        const lat = parseFloat(String(selectedShop.latitude))
        const lng = parseFloat(String(selectedShop.longitude))
        mapRef.current.setView([lat, lng], 16)
      }
    }
  }, [selectedShopId, shopsWithLocation, mounted])

  if (!mounted || typeof window === 'undefined') {
    return (
      <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-600">地図を読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded