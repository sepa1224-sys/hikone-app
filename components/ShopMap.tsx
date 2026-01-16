'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
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

function LocateButton() {
  const map = useMap()
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15)
      })
    }
  }
  return (
    <button onClick={handleLocate} className="absolute top-4 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg">
      <Navigation className="w-5 h-5 text-blue-600" />
    </button>
  )
}

export default function ShopMap({ shops, selectedShopId, onShopClick }: ShopMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [mounted, setMounted] = useState(false)
  const defaultCenter: [number, number] = [35.271, 136.257]

  useEffect(() => { setMounted(true) }, [])

  const shopsWithLocation = (shops || []).filter(s => s.latitude && s.longitude)

  useEffect(() => {
    if (selectedShopId && mapRef.current) {
      const target = shopsWithLocation.find(s => String(s.id) === String(selectedShopId))
      if (target) {
        mapRef.current.setView([Number(target.latitude), Number(target.longitude)], 16)
      }
    }
  }, [selectedShopId, shopsWithLocation])

  if (!mounted || typeof window === 'undefined') {
    return <div className="h-[500px] bg-gray-100 flex items-center justify-center">読み込み中...</div>
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-inner h-[500px]">
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }} ref={mapRef}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {shopsWithLocation.map((shop) => {
          const isSelected = String(shop.id) === String(selectedShopId)
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${isSelected ? '#3b82f6' : '#ef4444'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
          })

          return (
            <Marker 
              key={String(shop.id)} 
              position={[Number(shop.latitude), Number(shop.longitude)]} 
              icon={customIcon} 
              eventHandlers={{ click: () => onShopClick?.(shop) }}
            />
          )
        })}
        <LocateButton />
      </MapContainer>
    </div>
  )
}