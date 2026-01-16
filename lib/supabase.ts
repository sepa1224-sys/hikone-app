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
  latitude: number      // 緯度
  longitude: number     // 経度
  opening_hours: string // 営業時間
  phone: string         // 電話番号
  image_url?: string 
  // --- 💡 詳細ページ用の追加フィールド ---
  description?: string    // お店の紹介文
  price_range?: string    // 予算 (例: ¥1,000〜¥2,000)
  menu_items?: string[]   // メニュー名の配列 (Supabaseでは text[] 型)
  website_url?: string    // 公式サイトやInstagramのURL
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