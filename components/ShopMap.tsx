'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'

const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function MapRecenter({ shops }: { shops: Shop[] }) {
  const map = useMap()
  useEffect(() => {
    if (shops.length > 0) {
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
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
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
          {/* 💡 ポップアップのデザインを写真付きにアップグレード */}
          <Popup maxWidth={200}>
            <div className="w-40 overflow-hidden bg-white">
              {shop.image_url ? (
                <img 
                  src={shop.image_url} 
                  alt={shop.name} 
                  className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm"
                />
              ) : (
                <div className="w-full h-20 bg-gray-50 flex items-center justify-center rounded-lg mb-2 border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Photo</span>
                </div>
              )}
              <div className="px-1">
                <p className="font-black text-sm text-gray-900 leading-tight mb-0.5">{shop.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                    {shop.category}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}