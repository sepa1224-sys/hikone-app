'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'
import { Navigation } from 'lucide-react'

// アイコンの設定
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
  selectedShopId?: any
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
        () => alert('位置情報の取得に失敗しました')
      )
    }
  }
  return (
    <button
      onClick={handleLocate}
      className="absolute top-4 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
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
    setMounted(true)
  }, [])

  const shopsWithLocation = (shops || []).filter((shop) => {
    const lat = parseFloat(String(shop.latitude))
    const lng = parseFloat(String(shop.longitude))
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
  })

  useEffect(() => {
    if (selectedShopId && mapRef.current && mounted) {
      const selectedShop = shopsWithLocation.find((s) => String(s.id) === String(selectedShopId))
      if (selectedShop) {
        const lat = parseFloat(String(selectedShop.latitude))
        const lng = parseFloat(String(selectedShop.longitude))
        mapRef.current.setView([lat, lng], 16)
      }
    }
  }, [selectedShopId, shopsWithLocation, mounted])

  if (!mounted || typeof window === 'undefined') {
    return <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center">読み込み中...</div>
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-md" style={{ height: '500px' }}>
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }} ref={mapRef}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {shopsWithLocation.map((shop) => {
          const isSelected = String(shop.id) === String(selectedShopId)
          const lat = parseFloat(String(shop.latitude))
          const lng = parseFloat(String(shop.longitude))
          const markerColor = isSelected ? '#0ea5e9' : '#ef4444'
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; border-radius: 9999px; padding: 8px; border: 2px solid white;"></div>`,
            iconSize: [24, 24],
          })

          return (
            <Marker key={String(shop.id)} position={[lat, lng]} icon={customIcon} eventHandlers={{ click: () => onShopClick?.(shop) }}>
              <Popup><strong>{shop.name}</strong></Popup>
            </Marker>
          )
        })}
        <LocateButton onLocate={() => {}} />
      </MapContainer>
    </div>
  )
}