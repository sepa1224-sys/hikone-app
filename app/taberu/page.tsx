'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop, isShopOpen } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, CheckCircle2, X, Clock, Phone, UtensilsCrossed, Navigation, Map, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

// ShopMap を動的インポート（SSR無効化 + エラーハンドリング）
const ShopMap = dynamic(
  () => import('@/components/ShopMap').catch(err => {
    console.error('ShopMap ロードエラー:', err)
    // フォールバックコンポーネントを返す
    return { default: () => <div className="w-full h-full bg-red-50 flex items-center justify-center font-bold text-red-400">地図の読み込みに失敗しました</div> }
  }),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">地図を読み込み中...</div>,
  }
)

const CATEGORIES = [
  { id: 'カフェ', name: 'カフェ', icon: <Coffee size={14} />, color: 'bg-orange-100 text-orange-600' },
  { id: '居酒屋', name: '居酒屋', icon: <Beer size={14} />, color: 'bg-yellow-100 text-yellow-600' },
  { id: '和食', name: '和食', icon: <Store size={14} />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'イタリアン', name: 'イタリアン', icon: <Pizza size={14} />, color: 'bg-red-100 text-red-600' },
  { id: '焼肉', name: '焼肉', icon: <Utensils size={14} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'スイーツ', name: 'スイーツ', icon: <IceCream size={14} />, color: 'bg-pink-100 text-pink-600' },
]

// 都市ごとの座標マッピング（滋賀県・福井県の主要都市）
const CITY_COORDINATES: Record<string, [number, number]> = {
  // 滋賀県
  '彦根市': [35.2743, 136.2597],
  '長浜市': [35.3776, 136.2646],
  '大津市': [35.0045, 135.8686],
  '草津市': [35.0173, 135.9608],
  '守山市': [35.0580, 135.9941],
  '栗東市': [35.0202, 136.0022],
  '野洲市': [35.0680, 136.0330],
  '湖南市': [35.0058, 136.0867],
  '甲賀市': [34.9660, 136.1656],
  '近江八幡市': [35.1283, 136.0985],
  '東近江市': [35.1126, 136.2026],
  '米原市': [35.3147, 136.2908],
  '高島市': [35.3498, 136.0378],
  // 福井県
  '敦賀市': [35.6452, 136.0555],
  '小浜市': [35.4958, 135.7466],
  '福井市': [36.0652, 136.2219],
  // デフォルト
  'default': [35.2743, 136.2597] // 彦根市役所
}

export default function Taberu() {
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  
  // ユーザーの登録都市と地図の初期位置
  const [userCity, setUserCity] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(CITY_COORDINATES['default'])
  
  
  // ルート検索関連のステート
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeMode, setRouteMode] = useState<'walking' | 'driving' | 'transit'>('walking')
  const [routeData, setRouteData] = useState<{
    distance: { text: string; value: number }
    duration: { text: string; value: number }
    steps: Array<{ lat: number; lng: number }>
  } | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  
  // 写真ギャラリー関連のステート
  const [shopPhotos, setShopPhotos] = useState<string[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報をサポートしていません')
      return
    }

    setRouteLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setRouteLoading(false)
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        alert('位置情報の取得に失敗しました。位置情報の利用を許可してください。')
        setRouteLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // ルート検索を実行する関数
  const searchRoute = async () => {
    if (!currentLocation || !selectedShop) {
      alert('現在地が取得できていません')
      return
    }

    setRouteLoading(true)
    try {
      const response = await fetch(
        `/api/directions/route?originLat=${currentLocation.lat}&originLng=${currentLocation.lng}&destLat=${selectedShop.latitude}&destLng=${selectedShop.longitude}&mode=${routeMode}`
      )
      const data = await response.json()

      if (data.success) {
        setRouteData(data)
        setShowRoute(true)
      } else {
        alert(`ルート検索に失敗しました: ${data.error || '不明なエラー'}`)
        setRouteData(null)
      }
    } catch (error) {
      console.error('ルート検索エラー:', error)
      alert('ルート検索中にエラーが発生しました')
    } finally {
      setRouteLoading(false)
    }
  }

  // ユーザーのプロフィールから登録都市を取得
  useEffect(() => {
    async function fetchUserCity() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('city, location')
            .eq('id', session.user.id)
            .single()
          
          if (profile && !error) {
            const city = profile.city || profile.location
            console.log('🏙️ ユーザーの登録都市:', city)
            
            if (city) {
              setUserCity(city)
              // 都市の座標を設定（マッピングにあれば使用、なければデフォルト）
              const coordinates = CITY_COORDINATES[city] || CITY_COORDINATES['default']
              setMapCenter(coordinates)
              console.log(`📍 地図の中心を ${city} に設定:`, coordinates)
            }
          }
        } else {
          console.log('🏙️ 未ログイン: デフォルト座標（彦根市）を使用')
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error)
      }
    }
    
    fetchUserCity()
  }, [])

  // ===== 座標を安全にnumber型に変換するヘルパー関数 =====
  // Supabaseから取得した latitude/longitude を確実に number 型として処理
  const toValidNumber = (value: any): number | null => {
    // null, undefined, 空文字は無効
    if (value === null || value === undefined || value === '') return null
    
    // parseFloat(String()) で強制的に number 型に変換
    const num = parseFloat(String(value).trim())
    
    // NaN, Infinity は無効
    if (isNaN(num) || !isFinite(num)) return null
    
    return num
  }
  
  // ===== 座標が有効かどうかをチェック（緩和版）=====
  // latitude が null でなく、0 でなければ有効とみなす
  const isValidCoordinate = (lat: number | null, lng: number | null): boolean => {
    // null または undefined チェック
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false
    
    // 数値型チェック
    if (typeof lat !== 'number' || typeof lng !== 'number') return false
    
    // NaN チェック
    if (isNaN(lat) || isNaN(lng)) return false
    
    // 0 チェック（両方0は無効）
    if (lat === 0 || lng === 0) return false
    
    // 日本の座標範囲チェックは緩和（コメントアウト）
    // これにより、より多くのデータがマップに表示される
    // if (lat < 20 || lat > 50) return false
    // if (lng < 120 || lng > 150) return false
    
    return true
  }
  
  // ===== データ取得 useEffect =====
  // DBから取得した座標をそのまま地図に表示（APIは叩かない）
  useEffect(() => {
    const fetchShops = async () => {
      console.log('')
      console.log('========================================')
      console.log('🔄 DBからデータ取得中...')
      console.log('========================================')
      
      setLoading(true)
      
      try {
        // Supabase から全データを取得
        const { data, error } = await supabase
          .from('shops')
          .select('*')
        
        // ===== 1. エラーチェック =====
        if (error) {
          console.error('❌ DBエラー:', error)
          setLoading(false)
          return
        }
        
        // ===== 2. 生データをログ出力（デバッグ用）=====
        console.log('')
        console.log('📦 Raw Data:', data)
        console.log(`✅ DBから ${data?.length ?? 0} 件取得しました`)
        
        // データがない場合
        if (!data || data.length === 0) {
          console.log('⚠️ データが0件です。テーブル名を確認してください。')
          setLoading(false)
          return
        }
        
        // ===== 3. 最初の1件のカラム名を確認（デバッグ用）=====
        console.log('')
        console.log('🔍 最初の1件のカラム名:', Object.keys(data[0]))
        console.log('🔍 最初の1件の値:', data[0])
        
        // ===== 4. データ整形: 座標を数値に変換しつつセット =====
        // 座標が null のデータもそのまま含める
        const formattedData: Shop[] = data.map((s: any) => {
          // 座標エイリアス対応（lat/lng または latitude/longitude）
          const rawLat = s.latitude ?? s.lat ?? null
          const rawLng = s.longitude ?? s.lng ?? null
          
          // 数値に変換（null はそのまま null）
          const lat = rawLat !== null ? Number(rawLat) : null
          const lng = rawLng !== null ? Number(rawLng) : null
          
          return {
            id: s.id,
            name: s.name || '名称未設定',
            category: s.category || 'その他',
            address: s.address || '',
            phone: s.phone || s.tel || '',
            opening_hours: s.opening_hours || s.hours || '',
            price_range: s.price_range || s.budget || '',
            image_url: s.image_url || s.photo || s.thumbnail || '',
            image_urls: s.image_urls || [],
            latitude: lat,
            longitude: lng,
            place_id: s.place_id || undefined,
            menu_items: s.menu_items || []
          }
        })
        
        // ===== 5. 座標の有無をカウント =====
        const shopsWithCoords = formattedData.filter(s => 
          s.latitude !== null && s.latitude !== 0 && !isNaN(Number(s.latitude)) &&
          s.longitude !== null && s.longitude !== 0 && !isNaN(Number(s.longitude))
        )
        
        console.log('')
        console.log(`📊 座標状況: ${shopsWithCoords.length}/${formattedData.length}件が有効`)
        
        // ===== 6. ステートにセット =====
        setAllShops(formattedData)
        setFilteredShops(formattedData)
        
        console.log(`🗺️ ShopMap に ${formattedData.length} 件渡します`)
        
        // 地図の中心を有効な店舗に調整
        if (shopsWithCoords.length > 0) {
          const firstShop = shopsWithCoords[0]
          const centerLat = Number(firstShop.latitude)
          const centerLng = Number(firstShop.longitude)
          if (!isNaN(centerLat) && !isNaN(centerLng)) {
            setMapCenter([centerLat, centerLng])
            console.log(`📍 マップ中心: [${centerLat}, ${centerLng}]`)
          }
        }
        
        console.log('')
        console.log('🎉 データ取得完了 - DBの座標をそのまま表示')
        
      } catch (error) {
        console.error('❌ 店舗データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchShops()
  }, []) // 空の依存配列：初回マウント時のみ実行

  // フィルタリング（カテゴリ、検索、営業中）を適用
  useEffect(() => {
    if (allShops.length === 0) return
    
    let result = allShops.map(s => ({ ...s })) // 新しいオブジェクトを作成
    if (selectedCategory) result = result.filter(s => s.category === selectedCategory)
    if (searchQuery) result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (onlyOpen) result = result.filter(s => isShopOpen(s.opening_hours))
    
    setFilteredShops(result)
  }, [selectedCategory, onlyOpen, searchQuery, allShops])

  // 選択されたショップが変更された時にルート情報をリセット
  useEffect(() => {
    if (selectedShop) {
      setRouteData(null)
      setShowRoute(false)
      setCurrentPhotoIndex(0)
      
      // 写真は既存のimage_urlsを使用（API呼び出しなし）
      if (selectedShop.image_urls && selectedShop.image_urls.length > 0) {
        setShopPhotos(selectedShop.image_urls)
      } else {
        setShopPhotos([])
      }
      setPhotosLoading(false)
    }
  }, [selectedShop])
  
  // 写真ギャラリーの前後に移動する関数
  const goToPreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? shopPhotos.length - 1 : prev - 1))
  }

  const goToNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === shopPhotos.length - 1 ? 0 : prev + 1))
  }

  // スケルトンスクリーンコンポーネント
  const SkeletonShopCard = () => (
    <div className="cursor-pointer overflow-hidden bg-white rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="w-full h-44 bg-gray-200 animate-pulse"></div>
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-4 bg-gray-100 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
        </div>
      </div>
    </div>
  )

  // 読み込み中はスケルトンスクリーンを表示
  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full bg-white overflow-hidden relative">
        {/* 固定ヘッダー */}
        <div className="z-[100] bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
          <div className="max-w-md mx-auto space-y-3">
            <div className="bg-gray-50 rounded-full h-10 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* スクロールエリア */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white pb-24">
          {/* 地図エリアスケルトン */}
          <div className="w-full h-[50vh] bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 font-bold">地図を読み込み中...</div>
          </div>

          {/* レストランリストスケルトン */}
          <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 min-h-[50vh]">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4"></div>
            <div className="px-6">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-6 bg-gray-100 rounded-full w-12 animate-pulse"></div>
              </div>
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <SkeletonShopCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden relative">
      
      {/* 1. 固定ヘッダー */}
      <div className="z-[100] bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto space-y-3">
          {/* 検索バー */}
          <div className="bg-gray-50 rounded-full flex items-center p-2.5 px-4 gap-3 border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="お店を検索" 
              className="text-xs font-bold outline-none w-full bg-transparent text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setOnlyOpen(false)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${
                !onlyOpen ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              全て
            </button>
            <button 
              onClick={() => setOnlyOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black border transition-all ${
                onlyOpen ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <CheckCircle2 size={12} /> 営業中のみ
            </button>
          </div>
        </div>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white pb-24">
        
        {/* 2. 地図エリア */}
        <div className="w-full h-[50vh] relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ShopMap 
              shops={filteredShops} 
              routeData={routeData && showRoute && selectedShop?.latitude && selectedShop?.longitude ? {
                steps: routeData.steps,
                start_location: currentLocation || { lat: 0, lng: 0 },
                end_location: { 
                  lat: Number(selectedShop.latitude) || 0, 
                  lng: Number(selectedShop.longitude) || 0 
                }
              } : null}
              currentLocation={currentLocation}
              destinationShop={selectedShop}
              defaultCenter={mapCenter}
            />
          </div>
          <div className="absolute top-4 inset-x-0 z-50 pointer-events-none">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pl-4 pr-4 py-1 pointer-events-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`flex items-center gap-1.5 p-1 pr-3 rounded-full transition-all shrink-0 border-2 shadow-xl ${
                    selectedCategory === cat.id 
                      ? 'bg-orange-500 text-white border-orange-400 scale-105' 
                      : 'bg-white/95 backdrop-blur-md text-gray-700 border-white'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${selectedCategory === cat.id ? 'bg-white/20' : cat.color}`}>
                    {cat.icon}
                  </div>
                  <span className="text-[10px] font-black">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. レストランリスト */}
        <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 min-h-[50vh]">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4" />
          <div className="px-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">Nearby Spots</h2>
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">{filteredShops.length}件</span>
            </div>
            <div className="grid gap-6">
              {filteredShops.map((shop) => (
                <div 
                  key={shop.id} 
                  onClick={() => setSelectedShop(shop)}
                  className="cursor-pointer overflow-hidden bg-white rounded-[2rem] border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="w-full h-44 bg-gray-100 relative">
                    {shop.image_url ? (
                      <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">NO IMAGE</div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest">
                      {shop.category}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-md font-extrabold text-gray-900 leading-tight">{shop.name}</h3>
                      <Heart size={18} className="text-gray-300" />
                    </div>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin size={10} className="text-orange-500" /> {shop.address}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {shop.opening_hours}
                      </span>
                      <span className="text-gray-900">{shop.price_range || '¥ ---'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 詳細パネル（selectedShopがある時だけ表示） */}
      {selectedShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[1000]" onClick={() => setSelectedShop(null)} />
          <div className="fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[3rem] h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" onClick={() => setSelectedShop(null)} />
              <button onClick={() => setSelectedShop(null)} className="absolute right-6 top-4 bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
            </div>
            <div className="px-6 pb-40">
              {/* フォトギャラリー */}
              <div className="w-full h-64 rounded-[2.5rem] overflow-hidden mb-6 shadow-lg relative bg-gray-100">
                {photosLoading ? (
                  // スケルトンローディング
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                    <div className="text-gray-400 font-bold">写真を読み込み中...</div>
                  </div>
                ) : shopPhotos.length > 0 ? (
                  // 写真カルーセル
                  <div className="relative w-full h-full">
                    <img 
                      src={shopPhotos[currentPhotoIndex]} 
                      className="w-full h-full object-cover" 
                      alt={`${selectedShop.name} - 写真 ${currentPhotoIndex + 1}`}
                    />
                    {/* ナビゲーションボタン */}
                    {shopPhotos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToPreviousPhoto()
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                          aria-label="前の写真"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToNextPhoto()
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                          aria-label="次の写真"
                        >
                          <ChevronRight size={20} />
                        </button>
                        {/* インジケーター */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {shopPhotos.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentPhotoIndex(index)
                              }}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50'
                              }`}
                              aria-label={`写真 ${index + 1} に移動`}
                            />
                          ))}
                        </div>
                        {/* 写真カウンター */}
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-black">
                          {currentPhotoIndex + 1} / {shopPhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // プレースホルダー画像
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
                    <ImageIcon size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">写真準備中</p>
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">{selectedShop.name}</h2>
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">{selectedShop.category}</span>
                <span className="text-gray-900 font-black text-sm">{selectedShop.price_range}</span>
              </div>
              <div className="grid gap-4 bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
                <div className="flex items-start gap-3 text-sm font-bold text-gray-600"><MapPin size={18} className="text-orange-500 shrink-0" /> {selectedShop.address}</div>
                <div className="flex items-center gap-3 text-sm font-bold text-gray-600"><Clock size={18} className="text-orange-500 shrink-0" /> {selectedShop.opening_hours}</div>
                <a href={`tel:${selectedShop.phone}`} className="flex items-center gap-3 text-sm font-black text-blue-600"><Phone size={18} className="shrink-0" /> {selectedShop.phone}</a>
              </div>
              <h3 className="text-xl font-black mb-5 italic flex items-center gap-2"><UtensilsCrossed size={22} className="text-orange-500" /> Recommendation</h3>
              <div className="grid gap-4">
                {selectedShop.menu_items?.map((item, i) => {
                  const [name, price, ...imgParts] = item.split(':');
                  const img = imgParts.join(':');
                  return (
                    <div key={i} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm items-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                        {img ? <img src={img} className="w-full h-full object-cover" alt={name} /> : <div className="text-[10px] text-gray-300 font-bold p-4">No Image</div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-800 mb-1">{name}</p>
                        <p className="text-lg font-black text-orange-600"><span className="text-[10px]">¥</span>{Number(price).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* ルート検索セクション */}
              <div className="mt-8 mb-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-[2rem] border border-orange-100">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-900">
                  <Navigation size={20} className="text-orange-500" /> ルート検索
                </h3>
                
                {!currentLocation ? (
                  <button
                    onClick={getCurrentLocation}
                    disabled={routeLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {routeLoading ? (
                      <>
                        <div className="animate-spin">📍</div>
                        <span>位置情報取得中...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={18} />
                        <span>現在地を取得</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    {/* 移動手段選択 */}
                    <div className="flex gap-2 mb-4">
                      {[
                        { mode: 'walking' as const, label: '徒歩', icon: '🚶' },
                        { mode: 'driving' as const, label: '車', icon: '🚗' },
                        { mode: 'transit' as const, label: '公共交通', icon: '🚌' }
                      ].map(({ mode, label, icon }) => (
                        <button
                          key={mode}
                          onClick={() => setRouteMode(mode)}
                          className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${
                            routeMode === mode
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>

                    {/* ルート情報サマリー */}
                    {routeData && showRoute && (
                      <div className="bg-white p-4 rounded-[1.5rem] mb-4 border border-orange-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500">所要時間</span>
                          <span className="text-lg font-black text-orange-600">{routeData.duration.text}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">距離</span>
                          <span className="text-lg font-black text-gray-900">{routeData.distance.text}</span>
                        </div>
                      </div>
                    )}

                    {/* ルート検索ボタン */}
                    <button
                      onClick={searchRoute}
                      disabled={routeLoading}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                      {routeLoading ? (
                        <>
                          <div className="animate-spin">🔍</div>
                          <span>検索中...</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={18} />
                          <span>ルートを検索</span>
                        </>
                      )}
                    </button>

                    {/* Googleマップアプリで開くボタン */}
                    {routeData && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.latitude},${selectedShop.longitude}&travelmode=${routeMode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Map size={18} />
                        <span>Googleマップアプリで開く</span>
                      </a>
                    )}
                  </>
                )}
              </div>

              <a href={`https://www.google.com/maps/search/?api=1&query=${selectedShop.latitude},${selectedShop.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-10 flex items-center justify-center gap-2 w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">
                <MapPin size={20} /> ここに行く
              </a>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-top.leaflet-left { top: 12px !important; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-in.slide-in-from-bottom { animation: slide-up 0.3s ease-out; }
      `}      </style>
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}