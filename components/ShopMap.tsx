'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'
import { MapPin, Navigation } from 'lucide-react'

// ブラウザ環境でのみLeafletのアイコンを設定
if (typeof window !== 'undefined') {
  // Leafletのデフォルトアイコンの問題を修正
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface ShopMapProps {
  shops: Shop[]
  selectedShopId?: number
  onShopClick?: (shop: Shop) => void
}

// 現在地に移動するコンポーネント
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
      <Navigation className="w-5 h-5 text-primary-600" />
    </button>
  )
}

export default function ShopMap({ shops, selectedShopId, onShopClick }: ShopMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [mounted, setMounted] = useState(false)

  // 彦根駅周辺の座標（デフォルト）
  const defaultCenter: [number, number] = [35.271, 136.257]

  // ブラウザでのマウントを確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
    }
  }, [])

  // 有効な座標を持つ店舗のみをフィルタリング（数値として妥当かチェック）
  const shopsWithLocation = shops.filter((shop) => {
    const lat = typeof shop.latitude === 'number' ? shop.latitude : parseFloat(String(shop.latitude || ''))
    const lng = typeof shop.longitude === 'number' ? shop.longitude : parseFloat(String(shop.longitude || ''))
    const isValid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    return isValid
  }).map((shop) => ({
    ...shop,
    latitude: typeof shop.latitude === 'number' ? shop.latitude : parseFloat(String(shop.latitude || '0')),
    longitude: typeof shop.longitude === 'number' ? shop.longitude : parseFloat(String(shop.longitude || '0')),
  }))

  // デバッグログ
  useEffect(() => {
    console.log('ShopMap - データ数:', shops.length)
    console.log('ShopMap - 座標あり店舗数:', shopsWithLocation.length)
    console.log('ShopMap - 座標あり店舗詳細:', shopsWithLocation.map(s => ({
      name: s.name,
      lat: s.latitude,
      lng: s.longitude
    })))
  }, [shops, shopsWithLocation])

  // 選択された店舗にマップを移動
  useEffect(() => {
    if (selectedShopId && mapRef.current && mounted) {
      const selectedShop = shopsWithLocation.find((s) => s.id === selectedShopId)
      if (selectedShop?.latitude && selectedShop?.longitude) {
        mapRef.current.setView([selectedShop.latitude, selectedShop.longitude], 16)
      }
    }
  }, [selectedShopId, shopsWithLocation, mounted])

  // ブラウザ環境でない場合は空のdivを返す
  if (!mounted || typeof window === 'undefined') {
    return (
      <div className="w-full h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-600">地図を読み込み中...</div>
      </div>
    )
  }

  if (shopsWithLocation.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">地図に表示できる店舗がありません</p>
          <p className="text-sm text-gray-500">
            データ数: {shops.length}件、座標あり: {shopsWithLocation.length}件
          </p>
          {shops.length > 0 && (
            <div className="mt-4 text-xs text-gray-400">
              <p>最初の店舗データ（デバッグ用）:</p>
              <pre className="mt-2 text-left bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(shops[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-md" style={{ height: '500px' }}>
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '500px', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {shopsWithLocation
          .filter((shop) => {
            // 座標を数値として確実に変換して検証
            const lat = typeof shop.latitude === 'number' ? shop.latitude : parseFloat(String(shop.latitude || '0'))
            const lng = typeof shop.longitude === 'number' ? shop.longitude : parseFloat(String(shop.longitude || '0'))
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
          })
          .map((shop) => {
            const isSelected = shop.id === selectedShopId
            const isClosed = shop.status === 'temp_closed'

            // 座標を数値として確実に変換
            const lat = typeof shop.latitude === 'number' ? shop.latitude : parseFloat(String(shop.latitude || '0'))
            const lng = typeof shop.longitude === 'number' ? shop.longitude : parseFloat(String(shop.longitude || '0'))

            // カスタムアイコン
            const markerColor = isClosed ? '#6b7280' : isSelected ? '#0ea5e9' : '#ef4444'
            const customIcon = L.divIcon({
              className: 'custom-marker',
              html: `
                <div style="background-color: ${markerColor}; border-radius: 9999px; padding: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 2px solid white; transform: translate(-50%, -50%);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            })

            return (
              <Marker
                key={shop.id}
                position={[lat, lng]}
                icon={customIcon}
                eventHandlers={{
                  click: () => {
                    onShopClick?.(shop)
                  },
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold mb-1">{shop.name}</h3>
                    {shop.category && (
                      <span className="text-xs text-gray-600">{shop.category}</span>
                    )}
                    {isClosed && (
                      <div className="text-red-600 text-xs font-semibold mt-1">臨時休業</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        <LocateButton onLocate={(lat, lng) => {}} />
      </MapContainer>
    </div>
  )
}
