import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTI3ODYsImV4cCI6MjA4NDA2ODc4Nn0.OTwRa687dfxOpDs22NcS8BO2EXZYq-4pBIEh7_7RJow'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- お店（Shop）関連の型定義 ---
export type Shop = {
  id: string
  name: string
  category: string
  address: string
  latitude: number | null  // 緯度（未取得の場合はnull）
  longitude: number | null // 経度（未取得の場合はnull）
  place_id?: string        // Google Place ID（座標補正用）
  opening_hours: string    // 営業時間
  phone: string            // 電話番号
  image_url?: string 
  image_urls?: string[]    // Google Places APIから取得した写真URL配列（最大5枚）
  // --- 💡 詳細ページ用の追加フィールド ---
  description?: string     // お店の紹介文
  price_range?: string     // 予算 (例: ¥1,000〜¥2,000)
  menu_items?: string[]    // メニュー名の配列 (Supabaseでは text[] 型)
  website_url?: string     // 公式サイトやInstagramのURL
  view_count?: number      // 閲覧数（人気ランキング用）
  // --- フロントエンド用の計算フィールド ---
  distance?: number        // 現在地からの距離（km）
  isFavorite?: boolean     // お気に入り登録済みか
}

// --- お気に入り関連の型定義 ---
export type Favorite = {
  id: string
  user_id: string
  shop_id: string
  created_at: string
}

// 2点間の距離を計算（ハバーサインの公式）
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number | null,
  lon2: number | null
): number | null => {
  if (lat2 === null || lon2 === null) return null
  
  const R = 6371 // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 距離をフォーマットして表示
export const formatDistance = (distance: number | null | undefined): string => {
  if (distance === null || distance === undefined) return '距離不明'
  if (distance < 1) return `${Math.round(distance * 1000)}m`
  return `${distance.toFixed(1)}km`
}

// 営業中かどうかを判定する関数
export const isShopOpen = (openingHours: string) => {
  if (!openingHours || openingHours === 'NULL') return true
  // 将来的にはここで現在の時刻(new Date())と比較するロジックを実装可能
  return true 
}

// --- 電車（Train）関連の型定義と関数 ---
export interface TrainTimetable {
  id: number;
  station_name: string;
  line_name: string;
  direction: string;
  destination_station: string;
  departure_time: string;
  train_type: string;
  is_weekday: boolean;
}

// ページから呼び出される検索関数
export async function getTrainTimetables(station: string, destination: string) {
  const { data, error } = await supabase
    .from('train_timetables')
    .select('*')
    .eq('station_name', station)
    .eq('destination_station', destination)
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return data as TrainTimetable[];
}