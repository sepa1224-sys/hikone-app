'use client'

import Image from 'next/image'
import { Shop, isShopOpen } from '@/lib/supabase'
import { MapPin, Phone } from 'lucide-react'

interface ShopListProps {
  shops: Shop[]
  selectedShopId?: any // stringでもnumberでも受け取れるようにanyに変更
  onShopClick?: (shop: Shop) => void
}

export default function ShopList({ shops, selectedShopId, onShopClick }: ShopListProps) {
  if (!shops || shops.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">該当する店舗がありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {shops.map((shop) => {
        const isClosed = shop.status === 'temp_closed'
        // IDの型が違ってもエラーにならないようにStringに統一して比較
        const isSelected = String(shop.id) === String(selectedShopId)
        const isOpen = isShopOpen(shop.opening_hours)

        return (
          <div
            id={`shop-${shop.id}`}
            key={String(shop.id)}
            onClick={() => onShopClick?.(shop)}
            className={`bg-white rounded-xl shadow-md overflow-hidden transition-all cursor-pointer ${
              isSelected
                ? 'ring-2 ring-blue-500 scale-[1.02]'
                : 'hover:scale-[1.01] hover:shadow-lg'
            }`}
          >
            {/* 画像セクション */}
            <div className="relative w-full h-48 bg-gray-200">
              {shop.image_url ? (
                <div className={`relative w-full h-full ${isClosed ? 'grayscale' : ''}`}>
                  <Image
                    src={shop.image_url}
                    alt={shop.name || '店舗画像'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                  />
                  {isClosed && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="text-white text-2xl font-bold mb-2">CLOSED</div>
                        <div className="text-white text-sm">臨時休業</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gray-300 relative ${isClosed ? 'grayscale' : ''}`}>
                  {isClosed && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="text-white text-2xl font-bold mb-2">CLOSED</div>
                        <div className="text-white text-sm">臨時休業</div>
                      </div>
                    </div>
                  )}
                  <span className="text-gray-500 text-4xl">🍽️</span>
                </div>
              )}
            </div>

            {/* コンテンツセクション */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex-1">
                  {shop.name}
                </h2>
                {shop.category && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full ml-2 whitespace-nowrap">
                    {shop.category}
                  </span>
                )}
              </div>

              {/* 営業ステータス */}
              <div className="flex items-center gap-2 mb-2">
                {isClosed ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                    臨時休業
                  </span>
                ) : isOpen ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    営業中
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    営業時間外
                  </span>
                )}
              </div>

              {/* 説明文 (存在する場合のみ表示) */}
              {(shop as any).description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {(shop as any).description}
                </p>
              )}

              <div className="flex flex-col gap-2 text-xs text-gray-500">
                {shop.address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                )}
                {/* 電話番号 (存在する場合のみ表示) */}
                {(shop as any).phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span>{(shop as any).phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}