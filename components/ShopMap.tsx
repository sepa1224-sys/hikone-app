'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'

// 📌 修正ポイント：アイコンの「アンカー（錨）」をピンの先端に設定
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],      // アイコン画像のサイズ
  iconAnchor: [12, 41],     // 【重要】ピンの先端の位置。横の半分(12)と、縦の底(41)
  popupAnchor: [1, -34],   // ポップアップが出る位置
  shadowSize: [41, 41]
})

function MapRecenter({ shops }: { shops: Shop[] }) {
  const map = useMap()
  useEffect(() => {
    if (shops.length > 0) {
      // ズームレベルを17（かなり詳細）に設定して確認しやすくします
      map.setView([shops[0].latitude, shops[0].longitude], 17)
    }
  }, [shops, map])
  return null
}

export default function ShopMap({ shops }: { shops: Shop[] }) {
  const defaultCenter: [number, number] = [35.2721, 136.2641]

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={17} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapRecenter shops={shops} />

      {shops.map((shop) => (
        <Marker 
          key={shop.id} 
          position={[shop.latitude, shop.longitude]} 
          icon={icon}
        >
          <Popup>
            <div className="p-1">
              <p className="font-black text-sm">{shop.name}</p>
              <p className="text-[10px] text-gray-500">{shop.category}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}