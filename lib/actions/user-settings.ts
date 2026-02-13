'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type WidgetType = 'next_train' | 'garbage_info' | 'quick_action'

export interface WidgetConfig {
  id: WidgetType
  enabled: boolean
  order: number
  settings?: Record<string, any>
}

export interface UserWidgetSettings {
  widgets: WidgetConfig[]
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'next_train', enabled: true, order: 0 },
  { id: 'garbage_info', enabled: true, order: 1 },
  { id: 'quick_action', enabled: true, order: 2 },
]

export async function getWidgetSettings(userId: string): Promise<UserWidgetSettings> {
  const supabase = await createSupabaseServerClient()

  // 1. Get user settings
  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('widget_settings')
    .eq('user_id', userId)
    .single()

  if (settingsData?.widget_settings) {
    return settingsData.widget_settings as UserWidgetSettings
  }

  // 2. If no settings, get profile for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, residence')
    .eq('id', userId)
    .single()

  // 3. Personalize defaults
  let personalizedWidgets = [...DEFAULT_WIDGETS]

  if (profile) {
    if (profile.user_type === '大学生' || profile.user_type === '高校生') {
      // Students prioritize trains and quick actions (QR)
      personalizedWidgets = [
        { id: 'next_train', enabled: true, order: 0 },
        { id: 'quick_action', enabled: true, order: 1 },
        { id: 'garbage_info', enabled: true, order: 2 }, // Less priority?
      ]
    } else if (profile.user_type === '社会人' || profile.user_type === '主婦・主夫') {
      // Residents prioritize garbage info
      personalizedWidgets = [
        { id: 'garbage_info', enabled: true, order: 0 },
        { id: 'next_train', enabled: true, order: 1 },
        { id: 'quick_action', enabled: true, order: 2 },
      ]
    }
  }

  return { widgets: personalizedWidgets }
}

export async function updateWidgetSettings(userId: string, settings: UserWidgetSettings) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      widget_settings: settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('Failed to update widget settings:', error)
    throw new Error('Failed to update settings')
  }

  return { success: true }
}
