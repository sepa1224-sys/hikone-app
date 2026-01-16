import { createClient } from '@supabase/supabase-js'

// ★ここに、今コピーした「本物の情報」を貼り付けてください
const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTI3ODYsImV4cCI6MjA4NDA2ODc4Nn0.OTwRa687dfxOpDs22NcS8BO2EXZYq-4pBIEh7_7RJow'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Shop = {
  id: string // Table Editorを見るとuuid形式なのでstringにします
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  status: string
  opening_hours: string
}

export const isShopOpen = (openingHours: string) => {
  if (!openingHours || openingHours === 'NULL') return true
  // 簡易判定（必要に応じて後で調整）
  return true 
}