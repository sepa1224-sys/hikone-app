'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Recycle, Leaf, Calendar, X, ChevronRight, Home } from 'lucide-react'

// hikone_waste_master テーブルから取得するデータの型
export interface HikoneWasteMaster {
  area_name: string
  burnable: string | null           // 燃やせるごみ（例：「火・金」）
  non_burnable: string | null       // 燃やせないごみ（例：「第1・3月曜」）
  pet_plastic: string | null        // ペットボトル・プラスチック（例：「毎週月曜」）
  paper_cloth: string | null        // 古紙・古布
  bottles_cans: string | null       // びん・缶
}

// ゴミ種類の定義
const WASTE_TYPES = [
  { key: 'burnable', name: '燃やせるごみ', icon: '🔥', color: 'red' },
  { key: 'non_burnable', name: '燃やせないごみ', icon: '🗑️', color: 'gray' },
  { key: 'pet_plastic', name: 'ペットボトル・プラ', icon: '♻️', color: 'blue' },
  { key: 'paper_cloth', name: '古紙・古布', icon: '📰', color: 'indigo' },
  { key: 'bottles_cans', name: 'びん・缶', icon: '🥫', color: 'green' },
] as const

// 曜日の定義
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const DAY_NAMES_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']

// ゴミ種類のアイコンと色のマッピング
const GARBAGE_TYPE_STYLES: Record<string, { icon: any; color: string }> = {
  '燃やせるごみ': { icon: Trash2, color: 'red' },
  '燃やせないごみ': { icon: Leaf, color: 'gray' },
  'プラスチック製容器包装': { icon: Recycle, color: 'yellow' },
  '資源ごみ': { icon: Recycle, color: 'blue' },
  '古紙・古布': { icon: Recycle, color: 'indigo' },
  'びん・缶': { icon: Recycle, color: 'green' },
  'ペットボトル': { icon: Recycle, color: 'blue' },
  'ペットボトル・プラスチック製容器包装': { icon: Recycle, color: 'blue' },
  'ペットボトル・プラ': { icon: Recycle, color: 'blue' },
  '収集なし': { icon: Leaf, color: 'gray' },
  'default': { icon: Trash2, color: 'gray' }
}

// 曜日文字列をパースしてマッチするかチェックする関数
const parseScheduleString = (scheduleStr: string | null, targetDate: Date): boolean => {
  if (!scheduleStr || scheduleStr.trim() === '') return false
  
  const dayOfWeek = targetDate.getDay() // 0=日, 1=月, ..., 6=土
  const dayOfMonth = targetDate.getDate()
  const weekOfMonth = Math.ceil(dayOfMonth / 7) // 第何週か（1〜5）
  
  const targetDayName = DAY_NAMES[dayOfWeek] // 「月」「火」など（1文字）
  const targetDayNameFull = DAY_NAMES_FULL[dayOfWeek] // 「月曜日」など（フルネーム）
  
  // ===== 「毎週月曜」「毎週火曜日」のパターン =====
  if (scheduleStr.includes('毎週')) {
    // 「毎週」の後に曜日が含まれているかチェック
    if (scheduleStr.includes(targetDayName) || scheduleStr.includes(targetDayNameFull)) {
      return true
    }
  }
  
  // ===== 「第1・3月曜」「第2・4水曜日」のパターン =====
  const weekMatch = scheduleStr.match(/第([0-9・]+)([日月火水木金土])/)
  if (weekMatch) {
    const weeks = weekMatch[1].split('・').map(Number)
    const day = weekMatch[2]
    if (weeks.includes(weekOfMonth) && day === targetDayName) {
      return true
    }
  }
  
  // ===== 「月曜日」「火曜日」のような曜日フルネーム（毎週と解釈）=====
  if (scheduleStr.includes(targetDayNameFull)) {
    return true
  }
  
  // ===== 「火・金」「月・木」「月曜」のパターン（曜日が列挙されている）=====
  // 曜日の1文字を抽出（「日月火水木金土」のいずれか）
  const daysInStr = scheduleStr.match(/[日月火水木金土]/g)
  if (daysInStr && daysInStr.length > 0) {
    // 部分一致: 今日の曜日（1文字）が含まれていればマッチ
    if (daysInStr.includes(targetDayName)) {
      // ただし「第X週」の指定がある場合はその週のみ
      if (scheduleStr.includes('第')) {
        // 既に上で処理済みなので、ここでは false
        return false
      }
      return true
    }
  }
  
  return false
}

// 特定の曜日のゴミを取得する関数
const getWasteForDayOfWeek = (wasteData: HikoneWasteMaster | null, dayIndex: number): { name: string; icon: string; schedule: string }[] => {
  if (!wasteData) return []
  
  // 今週のその曜日の日付を計算
  const today = new Date()
  const currentDayOfWeek = today.getDay()
  const diff = dayIndex - currentDayOfWeek
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  
  const result: { name: string; icon: string; schedule: string }[] = []
  
  const wasteTypeMap: Record<string, { schedule: string | null }> = {
    'burnable': { schedule: wasteData.burnable },
    'non_burnable': { schedule: wasteData.non_burnable },
    'pet_plastic': { schedule: wasteData.pet_plastic },
    'paper_cloth': { schedule: wasteData.paper_cloth },
    'bottles_cans': { schedule: wasteData.bottles_cans },
  }
  
  for (const wt of WASTE_TYPES) {
    const scheduleData = wasteTypeMap[wt.key]
    if (scheduleData && parseScheduleString(scheduleData.schedule, targetDate)) {
      result.push({
        name: wt.name,
        icon: wt.icon,
        schedule: scheduleData.schedule || ''
      })
    }
  }
  
  return result
}

// 今日・明日のゴミ出しを取得する関数
const getTodayTomorrowWaste = (wasteData: HikoneWasteMaster | null): { today: string[], tomorrow: string[] } => {
  // データがない場合は空を返す
  if (!wasteData) {
    console.log('🗑️ ゴミ収集データがありません（wasteData is null）')
    return { today: [], tomorrow: [] }
  }
  
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // ===== 今日の曜日を取得（new Date().getDay() を使用）=====
  const todayDow = today.getDay() // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  const tomorrowDow = tomorrow.getDay()
  const todayDayName = DAY_NAMES[todayDow] // 日本語の曜日（1文字）
  const tomorrowDayName = DAY_NAMES[tomorrowDow]
  const todayDayNameFull = DAY_NAMES_FULL[todayDow] // 日本語の曜日（フルネーム）
  
  console.log(`🗑️ 今日: ${todayDayNameFull} (getDay=${todayDow})`)
  console.log(`🗑️ 明日: ${DAY_NAMES_FULL[tomorrowDow]} (getDay=${tomorrowDow})`)
  console.log(`🗑️ エリア: ${wasteData.area_name}`)
  
  const wasteTypesData = [
    { key: 'burnable', name: '燃やせるごみ', schedule: wasteData.burnable },
    { key: 'non_burnable', name: '燃やせないごみ', schedule: wasteData.non_burnable },
    { key: 'pet_plastic', name: 'ペットボトル・プラスチック製容器包装', schedule: wasteData.pet_plastic },
    { key: 'paper_cloth', name: '古紙・古布', schedule: wasteData.paper_cloth },
    { key: 'bottles_cans', name: 'びん・缶', schedule: wasteData.bottles_cans },
  ]
  
  const todayWaste: string[] = []
  const tomorrowWaste: string[] = []
  
  for (const wt of wasteTypesData) {
    // ===== 曜日の照合: parseScheduleString で部分一致（includes）を使用 =====
    const isTodayMatch = parseScheduleString(wt.schedule, today)
    const isTomorrowMatch = parseScheduleString(wt.schedule, tomorrow)
    
    // デバッグログ: スケジュール文字列と照合結果
    if (wt.schedule) {
      console.log(`   ${wt.name}: "${wt.schedule}" → 今日(${todayDayName}):${isTodayMatch ? '✅' : '❌'}, 明日(${tomorrowDayName}):${isTomorrowMatch ? '✅' : '❌'}`)
    }
    
    if (isTodayMatch) {
      todayWaste.push(wt.name)
    }
    if (isTomorrowMatch) {
      tomorrowWaste.push(wt.name)
    }
  }
  
  console.log(`🗑️ 結果 - 今日: [${todayWaste.join(', ') || 'なし'}], 明日: [${tomorrowWaste.join(', ') || 'なし'}]`)
  
  return { today: todayWaste, tomorrow: tomorrowWaste }
}

// カラーマップ
const colorMap: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
  'red': { bg: 'bg-red-50', iconBg: 'bg-red-100 text-red-500', text: 'text-red-400', border: 'border-red-200' },
  'yellow': { bg: 'bg-yellow-50', iconBg: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-500', border: 'border-yellow-200' },
  'blue': { bg: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-500', text: 'text-blue-400', border: 'border-blue-200' },
  'green': { bg: 'bg-green-50', iconBg: 'bg-green-100 text-green-500', text: 'text-green-400', border: 'border-green-200' },
  'gray': { bg: 'bg-gray-50', iconBg: 'bg-gray-100 text-gray-500', text: 'text-gray-400', border: 'border-gray-200' },
  'indigo': { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100 text-indigo-500', text: 'text-indigo-400', border: 'border-indigo-200' },
}

interface WasteScheduleCardProps {
  userCity: string | null
  userSelectedArea: string | null
  userWasteSchedule: HikoneWasteMaster | null
  onSetupClick?: () => void
}

export default function WasteScheduleCard({
  userCity,
  userSelectedArea,
  userWasteSchedule,
  onSetupClick
}: WasteScheduleCardProps) {
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // クライアントサイドでのみ実行（Portal用）
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // モーダル表示時に背後のスクロールを禁止
  useEffect(() => {
    if (showWeeklyModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    // クリーンアップ
    return () => {
      document.body.style.overflow = ''
    }
  }, [showWeeklyModal])
  
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayDow = today.getDay()
  const tomorrowDow = tomorrow.getDay()
  
  // hikone_waste_master からゴミの種類を取得
  const wasteInfo = getTodayTomorrowWaste(userWasteSchedule)
  
  // スタイル取得（最初のゴミ種類に基づく）
  const getStyle = (wasteTypes: string[]) => {
    if (wasteTypes.length === 0) return GARBAGE_TYPE_STYLES['default']
    return GARBAGE_TYPE_STYLES[wasteTypes[0]] || GARBAGE_TYPE_STYLES['default']
  }
  
  const todayStyle = getStyle(wasteInfo.today)
  const tomorrowStyle = getStyle(wasteInfo.tomorrow)
  
  const TodayIcon = todayStyle.icon
  const TomorrowIcon = tomorrowStyle.icon
  
  const todayColors = colorMap[todayStyle.color] || colorMap['gray']
  const tomorrowColors = colorMap[tomorrowStyle.color] || colorMap['gray']
  
  return (
    <>
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={18} className="text-red-500" />
          <h2 className="text-sm font-black text-gray-800">ゴミ収集情報</h2>
          <span className="text-[10px] font-bold text-gray-400 ml-auto">
            {userCity || '彦根市'}{userSelectedArea ? ` (${userSelectedArea.split('・')[0]}...)` : ''}
          </span>
        </div>
        
        {/* エリア未設定の場合 */}
        {!userSelectedArea ? (
          <div 
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={onSetupClick}
          >
            <p className="text-sm text-blue-700 font-bold text-center mb-2">
              💡 お住まいのエリアを設定しましょう
            </p>
            <p className="text-[10px] text-blue-500 text-center">
              プロフィールからお住まいのエリアを選択すると、<br/>
              正確なゴミ収集日が表示されます
            </p>
            <p className="text-[10px] text-blue-600 font-bold text-center mt-2">
              タップしてプロフィールを編集 →
            </p>
          </div>
        ) : (
          <>
            {/* 今日のメイン表示 */}
            {wasteInfo.today.length > 0 ? (
              <div className={`${todayColors.bg} rounded-2xl p-5 mb-3`}>
                <p className={`text-[10px] font-black ${todayColors.text} uppercase mb-2`}>
                  今日（{DAY_NAMES[todayDow]}曜日）
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${todayColors.iconBg} rounded-xl flex items-center justify-center`}>
                    <TodayIcon size={24} />
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-lg">
                      {wasteInfo.today.length === 1 
                        ? `${wasteInfo.today[0]}の日`
                        : `${wasteInfo.today[0]} 他${wasteInfo.today.length - 1}種`
                      }
                    </p>
                    {wasteInfo.today.length > 1 && (
                      <p className="text-[10px] text-gray-500">
                        {wasteInfo.today.join('、')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-5 mb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  今日（{DAY_NAMES[todayDow]}曜日）
                </p>
                <p className="font-black text-gray-500 text-lg">収集はありません</p>
              </div>
            )}
            
            {/* 明日のサブ表示 */}
            <div className={`${tomorrowColors.bg} rounded-2xl p-4 mb-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${tomorrowColors.iconBg} rounded-xl flex items-center justify-center`}>
                  <TomorrowIcon size={18} />
                </div>
                <div>
                  <p className={`text-[9px] font-black ${tomorrowColors.text} uppercase`}>
                    明日（{DAY_NAMES[tomorrowDow]}曜日）
                  </p>
                  <p className="font-black text-gray-700 text-sm">
                    {wasteInfo.tomorrow.length > 0 
                      ? wasteInfo.tomorrow.join('、')
                      : '収集なし'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* 他の曜日もみるボタン */}
            <button
              onClick={() => setShowWeeklyModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Calendar size={16} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-600">他の曜日もみる</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
          </>
        )}
      </div>
      
      {/* 週間カレンダーモーダル - Portal で body 直下にレンダリング */}
      {showWeeklyModal && mounted && createPortal(
        <div 
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 99999 }}
        >
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWeeklyModal(false)}
          />
          
          {/* モーダルコンテナ */}
          <div className="relative flex-1 flex items-end justify-center">
            <div 
              className="bg-white w-full max-w-md rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 40px)', height: 'auto' }}
            >
              {/* ヘッダー */}
              <div className="flex-shrink-0 p-5 border-b flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Calendar size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">週間ゴミ出しカレンダー</h2>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {userSelectedArea?.split('・')[0]}... エリア
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="p-2.5 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* スクロール可能なコンテンツ */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const wasteForDay = getWasteForDayOfWeek(userWasteSchedule, dayIndex)
                  const isToday = dayIndex === todayDow
                  
                  return (
                    <div 
                      key={dayIndex}
                      className={`rounded-2xl p-4 border-2 transition-all ${
                        isToday 
                          ? 'bg-orange-50 border-orange-300 shadow-md' 
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isToday ? 'text-orange-600' : 'text-gray-700'}`}>
                            {DAY_NAMES_FULL[dayIndex]}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded-full animate-pulse">
                              今日
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {wasteForDay.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {wasteForDay.map((waste, idx) => {
                            const wt = WASTE_TYPES.find(w => w.name === waste.name)
                            const colors = colorMap[wt?.color || 'gray']
                            return (
                              <div 
                                key={idx}
                                className={`flex items-center gap-1.5 px-3 py-1.5 ${colors.bg} ${colors.border} border rounded-full`}
                              >
                                <span className="text-sm">{waste.icon}</span>
                                <span className={`text-[11px] font-bold ${colors.text}`}>{waste.name}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-bold">収集なし</p>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* フッター - より目立つデザイン */}
              <div className="flex-shrink-0 p-4 border-t-2 border-gray-200 bg-white space-y-3 pb-6">
                <p className="text-[10px] text-gray-500 text-center font-bold">
                  ※ 祝日や年末年始は収集日が変更になる場合があります
                </p>
                {/* ホームに戻るボタン - より目立つ */}
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-base font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Home size={20} />
                  ホームに戻る
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
