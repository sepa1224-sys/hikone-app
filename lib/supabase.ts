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
  latitude: number
  longitude: number
  status: string
  opening_hours: string
  image_url?: string 
}

export const isShopOpen = (openingHours: string) => {
  if (!openingHours || openingHours === 'NULL') return true
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
    // ボタンの文字とデータベースの文字を比較
    .eq('station_name', station)
    .eq('destination_station', destination)
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return data as TrainTimetable[];
}