'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// 自治体統計情報の型
export interface MunicipalityStats {
  municipalityName: string      // 自治体名
  population: number            // 最新人口
  registeredUsers: number       // アプリ登録者数
  totalAppUsers: number         // アプリ全体の登録者数（フォールバック用）
  mascotName: string | null     // マスコット名
  populationUpdatedAt: string | null  // 人口更新日
}

// デフォルトの人口値（DBから取得できない場合のフォールバック）
// 2024年12月時点の推計値
const DEFAULT_POPULATIONS: Record<string, number> = {
  '彦根市': 110489,
  '大津市': 344900,
  '長浜市': 112500,
  '草津市': 148200,
  '近江八幡市': 80500,
  '守山市': 86200,
  '栗東市': 71800,
  '甲賀市': 86800,
  '野洲市': 51200,
  '湖南市': 54800,
  '東近江市': 111500,
  '米原市': 36200,
  '高島市': 44500,
  '日野町': 20500,
  '竜王町': 11800,
  '愛荘町': 20800,
  '豊郷町': 7100,
  '甲良町': 6400,
  '多賀町': 7000,
  '敦賀市': 63500,
}

// フォールバック値（DBから取得できない場合に使用）
const FALLBACK_STATS: MunicipalityStats = {
  municipalityName: '彦根市',
  population: 110489,  // 彦根市のデフォルト人口
  registeredUsers: 0,
  totalAppUsers: 0,
  mascotName: 'ひこにゃん',
  populationUpdatedAt: null
}

/**
 * 市名の正規化（揺らぎ対応）
 * トリム + 全角スペース除去 + 「市」補完
 */
function normalizeCity(city: string): string {
  // 全角・半角スペースを除去してトリム
  const trimmed = city.trim().replace(/[\s　]+/g, '')
  // 「市」「町」「村」「区」で終わっていない場合は「市」を追加
  if (!trimmed.match(/[市町村区]$/)) {
    return trimmed + '市'
  }
  return trimmed
}

/**
 * 市名から検索用パターンを生成
 * 「彦根市」→「彦根」（「市」を除去した基本形）
 */
function getCityBase(city: string): string {
  return city.replace(/[市町村区]$/, '')
}

/**
 * 自治体の統計情報を取得するフェッチャー（キャッシュなし）
 * @param city ユーザーの市区町村
 * @param currentUserId 現在のユーザーID（自分自身がカウントに含まれているか確認用）
 */
const fetchMunicipalityStats = async (city: string | null, currentUserId?: string | null): Promise<MunicipalityStats> => {
  const timestamp = new Date().toISOString()
  console.log(`\n========== 📊 [Stats] フェッチ開始 ${timestamp} ==========`)
  console.log(`📊 [Stats] ユーザーの自治体（入力値）: "${city}"`)
  console.log(`📊 [Stats] 現在のユーザーID: ${currentUserId || '未ログイン'}`)
  
  // 市が指定されていない場合はデフォルト（彦根市）のデータをDBから取得
  if (!city) {
    console.log('📊 [Stats] 市が指定されていません。デフォルト（彦根市）のデータをDBから取得')
    try {
      // 彦根市の人口をDBから取得
      const { data: hikoneData, error: hikoneError } = await supabase
        .from('municipalities')
        .select('name, population, mascot_name, population_updated_at')
        .eq('name', '彦根市')
        .maybeSingle()
      
      if (hikoneError) {
        console.error('📊 [Stats] 彦根市の人口取得エラー:', hikoneError.message)
      }
      
      // DBから取得できなかった場合はデフォルト値を使用
      const hikonePopulation = (hikoneData as any)?.population ?? DEFAULT_POPULATIONS['彦根市']
      console.log(`📊 [Stats] 彦根市の人口: ${hikonePopulation} (DB: ${(hikoneData as any)?.population ?? 'null'}, デフォルト: ${DEFAULT_POPULATIONS['彦根市']})`)
      
      // 彦根市の登録者数を取得
      const { count: hikoneUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('city', '彦根市')
      
      // アプリ全体の登録者数も取得（参考用）
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
      
      console.log(`📊 [Stats] 彦根市の登録者数: ${hikoneUsers ?? 0}人`)
      console.log(`📊 [Stats] アプリ全体の登録者数: ${totalUsers ?? 0}人`)
      
      return {
        municipalityName: '彦根市',
        population: hikonePopulation,  // DBから取得した人口（なければデフォルト値）
        registeredUsers: hikoneUsers ?? 0,
        totalAppUsers: totalUsers ?? 0,
        mascotName: (hikoneData as any)?.mascot_name ?? 'ひこにゃん',
        populationUpdatedAt: (hikoneData as any)?.population_updated_at ?? null
      }
    } catch (err) {
      console.error('📊 [Stats] デフォルトデータ取得エラー:', err)
      return FALLBACK_STATS
    }
  }
  
  // 市名を正規化（トリム + スペース除去）
  const normalizedCity = normalizeCity(city)
  const cityBase = getCityBase(normalizedCity)
  
  console.log(`📊 [Stats] 正規化後: "${normalizedCity}", 基本形: "${cityBase}"`)
  
  try {
    // ============ ステップ1: municipalitiesテーブルから人口情報を取得 ============
    console.log(`\n📊 [Stats] === ステップ1: municipalities テーブルから人口取得 ===`)
    
    let municipality = null
    
    // 方法1: name で完全一致（トリム済み）
    console.log(`📊 [Stats] 検索1: name='${normalizedCity}'`)
    try {
      const { data: exactMatch, error: exactError } = await supabase
        .from('municipalities')
        .select('name, population, mascot_name, population_updated_at')
        .eq('name', normalizedCity)
        .maybeSingle()
      
      if (exactMatch) {
        municipality = exactMatch
        console.log(`📊 [Stats] ✅ nameで完全一致で発見!`)
      } else if (exactError) {
        console.error(`📊 [Stats] 検索1エラー: ${exactError.message}`)
      }
    } catch (e) {
      console.error(`📊 [Stats] 検索1で例外発生:`, e)
    }
    
    if (!municipality) {
      // 方法2: ILIKE部分一致（name）
      console.log(`📊 [Stats] 検索2: ilike('name', '%${cityBase}%')`)
      try {
        const { data: likeMatches, error: likeError } = await supabase
          .from('municipalities')
          .select('name, population, mascot_name, population_updated_at')
          .ilike('name', `%${cityBase}%`)
          .limit(5)
        
        if (likeMatches && likeMatches.length > 0) {
          municipality = likeMatches[0]
          console.log(`📊 [Stats] ✅ nameで部分一致で発見!`)
        } else if (likeError) {
          console.error(`📊 [Stats] 検索2エラー: ${likeError.message}`)
        }
      } catch (e) {
        console.error(`📊 [Stats] 検索2で例外発生:`, e)
      }
    }
    
    // municipalitiesテーブルの全データを確認（デバッグ用）
    try {
      const { data: allMunis } = await supabase
        .from('municipalities')
        .select('name, population')
        .order('name')
        .limit(20)
      console.log(`📊 [Stats] municipalitiesテーブルの内容 (先頭20件):`, allMunis?.map((m: any) => `${m.name}:${m.population}`))
    } catch (e) {
      console.error(`📊 [Stats] municipalities一覧取得で例外発生:`, e)
    }
    
    // ============ ステップ2: profilesテーブルから登録者数をカウント ============
    console.log(`\n📊 [Stats] === ステップ2: profiles テーブルから町ごとの登録者数カウント ===`)
    
    let registeredUsers = 0
    let usedSearchPattern = ''
    
    // 方法1: 正規化した市名で完全一致（最も正確）
    console.log(`📊 [Stats] カウント1: eq('city', '${normalizedCity}')`)
    try {
      const { count: count1, error: err1 } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('city', normalizedCity)
      
      if (count1 !== null && count1 > 0) {
        registeredUsers = count1
        usedSearchPattern = `eq('city', '${normalizedCity}')`
      } else if (err1) {
        console.error(`📊 [Stats] カウント1エラー: ${err1.message}`)
      }
    } catch (e) {
      console.error(`📊 [Stats] カウント1で例外発生:`, e)
    }
    
    // 方法2: 元の入力値で検索（「彦根」など市なしパターン）
    if (registeredUsers === 0 && city !== normalizedCity) {
      console.log(`📊 [Stats] カウント2: eq('city', '${city}')`)
      try {
        const { count: count2, error: err2 } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('city', city)
        
        if (count2 !== null && count2 > 0) {
          registeredUsers = count2
          usedSearchPattern = `eq('city', '${city}')`
        }
      } catch (e) {
        console.error(`📊 [Stats] カウント2で例外発生:`, e)
      }
    }
    
    // 方法3: ILIKE部分一致（「彦根」で「彦根市」もカウント）
    if (registeredUsers === 0) {
      console.log(`📊 [Stats] カウント3: ilike('city', '%${cityBase}%')`)
      try {
        const { count: count3, error: err3 } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('city', `%${cityBase}%`)
        
        if (count3 !== null && count3 > 0) {
          registeredUsers = count3
          usedSearchPattern = `ilike('city', '%${cityBase}%')`
        }
      } catch (e) {
        console.error(`📊 [Stats] カウント3で例外発生:`, e)
      }
    }
    
    console.log(`📊 [Stats] 町ごとの登録者数: ${registeredUsers}人 (パターン: ${usedSearchPattern || 'なし'})`)
    
    // ============ 自分自身がカウントに含まれているか確認 ============
    if (currentUserId) {
      console.log(`\n📊 [Stats] === 自分自身の確認 ===`)
      try {
        const { data: myProfile, error: myError } = await supabase
          .from('profiles')
          .select('id, city')
          .eq('id', currentUserId)
          .maybeSingle()
        
        if (myProfile) {
          console.log(`📊 [Stats] 自分のプロフィール: city="${myProfile.city}"`)
          
          // 自分の city が検索条件に一致するか確認
          const myCity = myProfile.city?.trim() || ''
          const myCityMatches = 
            myCity === normalizedCity ||
            myCity === city ||
            myCity.includes(cityBase) ||
            (cityBase && myCity.includes(cityBase))
          
          if (myCityMatches) {
            console.log(`📊 [Stats] ✅ 自分は「${normalizedCity}」のカウントに含まれています`)
          } else {
            console.log(`📊 [Stats] ⚠️ 自分の city (${myCity}) は検索条件 (${normalizedCity}) と一致しません`)
          }
        }
      } catch (e) {
        console.error(`📊 [Stats] 自己プロフィール確認で例外発生:`, e)
      }
    }
    
    // profilesテーブルのcity一覧を確認（デバッグ用）
    try {
      const { data: profileCities } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null)
        .limit(50)
      const uniqueCities = [...new Set(profileCities?.map(p => p.city).filter(Boolean))]
      console.log(`📊 [Stats] profilesテーブルのcity一覧:`, uniqueCities)
    } catch (e) {
      console.error(`📊 [Stats] profiles city一覧取得で例外発生:`, e)
    }
    
    // ============ ステップ3: アプリ全体の登録者数（参考用） ============
    console.log(`\n📊 [Stats] === ステップ3: アプリ全体の登録者数 ===`)
    let totalAppUsers = 0
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
      totalAppUsers = totalUsers ?? 0
    } catch (e) {
      console.error(`📊 [Stats] 全体登録者数カウントで例外発生:`, e)
    }
    
    // ============ 最終結果 ============
    const displayCity = (municipality as any)?.name || normalizedCity
    
    // 人口の取得優先順位:
    // 1. DBから取得した値
    // 2. デフォルト人口値（DEFAULT_POPULATIONS）
    // 3. フォールバック値（110489 = 彦根市）
    let finalPopulation = (municipality as any)?.population
    let finalMascot = (municipality as any)?.mascot_name
    
    if (!finalPopulation || finalPopulation === 0) {
      // DBから取得できなかった場合、デフォルト値を使用
      const defaultPop = DEFAULT_POPULATIONS[displayCity] || DEFAULT_POPULATIONS[normalizedCity]
      if (defaultPop) {
        finalPopulation = defaultPop
        console.log(`📊 [Stats] ⚠️ DBに「${displayCity}」の人口データがないため、デフォルト値を使用: ${finalPopulation}`)
      } else {
        // どちらも見つからない場合は彦根市のデフォルト値
        finalPopulation = DEFAULT_POPULATIONS['彦根市']
        console.log(`📊 [Stats] ⚠️ 「${displayCity}」のデフォルト値もないため、彦根市の値を使用: ${finalPopulation}`)
      }
    }
    
    const stats: MunicipalityStats = {
      municipalityName: displayCity,
      population: finalPopulation,  // DBから取得した値（なければデフォルト）
      registeredUsers: registeredUsers,  // 町ごとの登録者数
      totalAppUsers: totalAppUsers,
      mascotName: finalMascot || null,
      populationUpdatedAt: (municipality as any)?.population_updated_at || null
    }
    
    console.log(`\n📊 [Stats] ========== 最終結果 ==========`)
    console.log(`📊 [Stats] 自治体名: ${stats.municipalityName}`)
    console.log(`📊 [Stats] 人口: ${stats.population.toLocaleString()}人`)
    console.log(`📊 [Stats] 町の登録者数: ${stats.registeredUsers}人`)  // 町ごとの数
    console.log(`📊 [Stats] アプリ全体: ${stats.totalAppUsers}人`)
    console.log(`📊 [Stats] =====================================\n`)
    
    return stats
    
  } catch (error) {
    console.error('📊 [Stats] 致命的エラー:', error)
    
    // エラー時でもアプリ全体の登録者数を取得
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
      
      return {
        ...FALLBACK_STATS,
        municipalityName: normalizedCity,
        registeredUsers: 0,
        totalAppUsers: totalUsers ?? 0
      }
    } catch {
      return FALLBACK_STATS
    }
  }
}

/**
 * 自治体統計情報を取得するカスタムフック
 * @param city ユーザーの居住市区町村（nullの場合はアプリ全体の統計）
 * @param currentUserId 現在のユーザーID（自分がカウントに含まれているか確認用、オプション）
 */
export function useMunicipalityStats(city: string | null, currentUserId?: string | null) {
  // タイムスタンプを含めたキーで毎回フレッシュなデータを取得
  // cityがnullでもフェッチする（アプリ全体の登録者数を表示）
  const { data, error, isLoading, mutate } = useSWR(
    `municipality-stats:${city || 'all'}:${currentUserId || 'guest'}`,
    () => fetchMunicipalityStats(city, currentUserId),
    {
      revalidateOnFocus: true,        // フォーカス時に再取得
      revalidateOnReconnect: true,    // 再接続時に再取得
      revalidateOnMount: true,        // マウント時に必ず再取得
      revalidateIfStale: true,        // staleなら再検証
      refreshInterval: 30000,         // 30秒ごとに自動更新
      dedupingInterval: 5000,         // 5秒間は重複リクエストを防ぐ
      focusThrottleInterval: 10000,   // フォーカス時の再取得を10秒に1回に制限
    }
  )
  
  // デフォルト値を設定（DBから取得されるまでの一時的な値）
  // isLoadingがtrueの間は読み込み中と表示、データ取得後はデフォルト人口を表示
  const cityName = city || '彦根市'
  const defaultPopulation = DEFAULT_POPULATIONS[cityName] || DEFAULT_POPULATIONS['彦根市']
  
  const stats = data ?? {
    municipalityName: cityName,
    population: defaultPopulation,  // デフォルト人口（0人が表示されないように）
    registeredUsers: 0,
    totalAppUsers: 0,
    mascotName: null,
    populationUpdatedAt: null
  }
  
  return {
    stats,
    isLoading,
    error,
    refetch: () => mutate(undefined, { revalidate: true }) // 強制的に再フェッチ
  }
}

/**
 * 人口表示用のフォーマット関数
 * @param stats 統計情報
 * @returns フォーマット済みの文字列
 */
export function formatPopulationDisplay(stats: MunicipalityStats): string {
  const registered = stats.registeredUsers.toLocaleString()
  const population = stats.population.toLocaleString()
  return `${registered}人 / ${population}人（${stats.municipalityName}）`
}

/**
 * 登録率を計算
 * @param stats 統計情報
 * @returns 登録率（パーセント）
 */
export function calculateRegistrationRate(stats: MunicipalityStats): number {
  if (stats.population <= 0) return 0
  return (stats.registeredUsers / stats.population) * 100
}
