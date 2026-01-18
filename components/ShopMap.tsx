'use client'

import { useEffect, useRef, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'

// アイコンをモジュールレベルでキャッシュ（再生成を防止）
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const destinationIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// 座標を安全に数値に変換する関数（より寛容に）
const toSafeNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null
  // 文字列の場合もパース
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  if (isNaN(num) || !isFinite(num)) return null
  return num
}

// 座標が有効かどうかを判定（描画時のみのチェック用）
// データ自体は null でも受け取れるように、このチェックは描画時のみ使用
const isValidJapanCoord = (lat: number | null, lng: number | null): boolean => {
  // null / undefined チェック
  if (lat == null || lng == null) return false
  
  // Number() で数値に変換
  const numLat = Number(lat)
  const numLng = Number(lng)
  
  // NaN チェック（変換失敗）
  if (isNaN(numLat) || isNaN(numLng)) return false
  
  // 0 チェック（無効な座標）
  if (numLat === 0 || numLng === 0) return false
  
  return true
}

// 軽量版 MapRecenter
const MapRecenter = memo(function MapRecenter({ shops, defaultCenter }: { shops: Shop[], defaultCenter: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !map.getContainer) return

    // 日本の座標範囲内の有効なショップのみ取得
    const validShops = shops.filter(shop => {
      const lat = toSafeNumber(shop.latitude ?? (shop as any).lat)
      const lng = toSafeNumber(shop.longitude ?? (shop as any).lng)
      return isValidJapanCoord(lat, lng)
    })

    console.log(`📍 MapRecenter: 全${shops.length}件中、有効座標${validShops.length}件`)

    try {
      if (validShops.length > 0) {
        const bounds = L.latLngBounds(
          validShops.map(shop => {
            const lat = toSafeNumber(shop.latitude ?? (shop as any).lat) as number
            const lng = toSafeNumber(shop.longitude ?? (shop as any).lng) as number
            return [lat, lng] as [number, number]
          })
        )
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      } else {
        map.setView(defaultCenter, 14)
      }
    } catch {
      map.setView(defaultCenter, 14)
    }
  }, [shops.length, map, defaultCenter])

  return null
})

interface RouteData {
  steps: Array<{ lat: number; lng: number }>
  start_location: { lat: number; lng: number }
  end_location: { lat: number; lng: number }
}

interface ShopMapProps {
  shops: Shop[]
  routeData?: RouteData | null
  currentLocation?: { lat: number; lng: number } | null
  destinationShop?: Shop | null
  defaultCenter?: [number, number]
}

// メモ化されたマーカーコンポーネント（パフォーマンス向上）
const ShopMarker = memo(function ShopMarker({ 
  shop, 
  isDestination 
}: { 
  shop: Shop
  isDestination: boolean 
}) {
  // 座標を安全に数値変換（shop.latitude / shop.lat どちらにも対応）
  const lat = toSafeNumber(shop.latitude ?? (shop as any).lat)
  const lng = toSafeNumber(shop.longitude ?? (shop as any).lng)
  
  // 有効な座標がない場合はマーカーを描画しない（日本の範囲内かチェック）
  if (!isValidJapanCoord(lat, lng)) {
    return null
  }

  return (
    <Marker 
      position={[lat as number, lng as number]} 
      icon={isDestination ? destinationIcon : icon}
    >
      <Popup maxWidth={200}>
        <div className="w-40 overflow-hidden bg-white">
          {shop.image_url ? (
            <img 
              src={shop.image_url} 
              alt={shop.name} 
              className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm"
              loading="lazy"
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
  )
})

function ShopMap({ shops, routeData, currentLocation, destinationShop, defaultCenter: propDefaultCenter }: ShopMapProps) {
  const defaultCenter: [number, number] = propDefaultCenter || [35.2743, 136.2597]
  const mapRef = useRef<L.Map | null>(null)

  // デバッグ: 受け取ったデータを確認（データ自体は null でも受け取る）
  useEffect(() => {
    if (shops.length > 0) {
      const validCount = shops.filter(s => {
        const lat = toSafeNumber(s.latitude ?? (s as any).lat)
        const lng = toSafeNumber(s.longitude ?? (s as any).lng)
        return isValidJapanCoord(lat, lng)
      }).length
      
      console.log(`🗺️ ShopMap: 全${shops.length}件受信 → 有効座標${validCount}件（描画対象）`)
      
      // null のデータ数も表示
      const nullCount = shops.filter(s => s.latitude == null || s.longitude == null).length
      if (nullCount > 0) {
        console.log(`   ⚠️ 座標が null の店舗: ${nullCount}件（座標取得待ち）`)
      }
    }
  }, [shops])

  // 描画時のみフィルタリング：データ自体は全て受け取り、描画時に有効な座標のみ表示
  // ShopMarker 内で無効な座標は null を返すので、ここでは緩やかにフィルタリング
  const validShops = useMemo(() => {
    // 描画対象: 座標が有効なもののみ（描画時のチェック）
    const filtered = shops.filter(shop => {
      const lat = toSafeNumber(shop.latitude ?? (shop as any).lat)
      const lng = toSafeNumber(shop.longitude ?? (shop as any).lng)
      return isValidJapanCoord(lat, lng)
    })
    console.log(`📊 ShopMap: ${filtered.length}/${shops.length}件を描画`)
    return filtered
  }, [shops])

  // ルート座標のメモ化
  const routeCoordinates = useMemo(() => {
    return routeData?.steps.map(step => [step.lat, step.lng] as [number, number]) || []
  }, [routeData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ height: '100%', width: '100%' }} id="shop-map-container">
      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapRecenter shops={validShops} defaultCenter={defaultCenter} />

        {/* ルートポリライン */}
        {routeData && routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#4285F4"
            weight={5}
            opacity={0.7}
          />
        )}

        {/* 現在地マーカー */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]} 
            icon={startIcon}
          >
            <Popup>
              <div className="text-sm font-bold">現在地</div>
            </Popup>
          </Marker>
        )}

        {/* 店舗マーカー（全データを回し、ShopMarker内で座標を検証） */}
        {shops.map((shop) => (
          <ShopMarker 
            key={shop.id} 
            shop={shop} 
            isDestination={!!destinationShop && shop.id === destinationShop.id}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default memo(ShopMap)
