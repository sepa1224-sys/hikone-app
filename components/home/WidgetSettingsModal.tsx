'use client'

import { useState } from 'react'
import { X, Check, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { UserWidgetSettings, updateWidgetSettings, WidgetConfig } from '@/lib/actions/user-settings'

interface WidgetSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: UserWidgetSettings
  userId: string
  onSave: (newSettings: UserWidgetSettings) => void
}

const WIDGET_LABELS: Record<string, string> = {
  'next_train': '電車の時刻表 (Next Train)',
  'garbage_info': 'ゴミ出し情報',
  'quick_action': 'クイックアクション (QR/検索)',
}

export default function WidgetSettingsModal({
  isOpen,
  onClose,
  settings,
  userId,
  onSave
}: WidgetSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<UserWidgetSettings>(settings)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleToggle = (widgetId: string) => {
    setLocalSettings(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    }))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const sorted = [...localSettings.widgets].sort((a, b) => a.order - b.order)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    // Swap order values
    const tempOrder = sorted[index].order
    sorted[index].order = sorted[targetIndex].order
    sorted[targetIndex].order = tempOrder
    
    setLocalSettings(prev => ({ ...prev, widgets: sorted }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateWidgetSettings(userId, localSettings)
      onSave(localSettings)
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // Sort by order for display
  const sortedWidgets = [...localSettings.widgets].sort((a, b) => a.order - b.order)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-black text-gray-800">ホーム画面のカスタマイズ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-gray-500 font-bold mb-2">
            表示するウィジェットを選択してください
          </p>
          
          <div className="space-y-3">
            {sortedWidgets.map((widget, index) => (
              <div 
                key={widget.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  widget.enabled 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-100 bg-white opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => handleToggle(widget.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      widget.enabled 
                        ? 'bg-orange-500 border-orange-500' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {widget.enabled && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-sm font-bold ${widget.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                    {WIDGET_LABELS[widget.id] || widget.id}
                  </span>
                </div>
                
                {/* Sort buttons */}
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === sortedWidgets.length - 1}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Check size={18} />
                保存する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
