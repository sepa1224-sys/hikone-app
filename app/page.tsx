'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Sun, Send, X, Home, Trash2, UserCircle, Sparkles, Building2, Map as MapIcon, 
  Utensils, Train, ChevronRight, Store, LogOut, Edit, Mail, Calendar, MapPin, User, Bus, ShoppingBag, Search
} from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

const cityData: Record<string, any> = {
  hikone: { name: '彦根市', food: '近江ちゃんぽん', move: 'ご城下巡回バス', shop: '四番町スクエア', color: 'from-orange-500 to-red-600' },
  nagahama: { name: '長浜市', food: '焼鯖そうめん', move: '北国街道さんぽ', shop: '黒壁スクエア', color: 'from-blue-600 to-cyan-500' },
  tsuruga: { name: '敦賀市', food: '越前ガニ', move: 'ぐるっと敦賀周遊バス', shop: '日本海さかな街', color: 'from-emerald-600 to-teal-500' }
}

// 日本全国の都道府県リスト
const ALL_PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

// 都道府県ごとの主要市区町村リスト
const PREFECTURE_CITIES: Record<string, string[]> = {
  '北海道': ['札幌市', '函館市', '旭川市', '釧路市', '帯広市', '北見市', '小樽市', '苫小牧市', '千歳市', '江別市'],
  '青森県': ['青森市', '弘前市', '八戸市', '黒石市', '五所川原市', '十和田市', 'むつ市'],
  '岩手県': ['盛岡市', '宮古市', '大船渡市', '花巻市', '北上市', '久慈市', '遠野市', '一関市', '陸前高田市', '釜石市'],
  '宮城県': ['仙台市', '石巻市', '塩竈市', '気仙沼市', '白石市', '名取市', '角田市', '多賀城市', '岩沼市'],
  '秋田県': ['秋田市', '能代市', '横手市', '大館市', '男鹿市', '湯沢市', '鹿角市', '由利本荘市', '潟上市'],
  '山形県': ['山形市', '米沢市', '鶴岡市', '酒田市', '新庄市', '寒河江市', '上山市', '村山市', '長井市', '天童市'],
  '福島県': ['福島市', '会津若松市', '郡山市', 'いわき市', '白河市', '須賀川市', '喜多方市', '相馬市', '二本松市', '田村市'],
  '茨城県': ['水戸市', '日立市', '土浦市', '古河市', '石岡市', '結城市', '龍ケ崎市', '下妻市', '常総市', '常陸太田市'],
  '栃木県': ['宇都宮市', '足利市', '栃木市', '佐野市', '鹿沼市', '日光市', '小山市', '真岡市', '大田原市', '那須塩原市'],
  '群馬県': ['前橋市', '高崎市', '桐生市', '伊勢崎市', '太田市', '沼田市', '館林市', '渋川市', '藤岡市', '富岡市'],
  '埼玉県': ['さいたま市', '川越市', '熊谷市', '川口市', '行田市', '秩父市', '所沢市', '飯能市', '加須市', '本庄市'],
  '千葉県': ['千葉市', '銚子市', '市川市', '船橋市', '館山市', '木更津市', '松戸市', '野田市', '茂原市', '成田市'],
  '東京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '練馬区', '北区', '荒川区', '板橋区', '足立区', '葛飾区', '江戸川区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '横須賀市', '平塚市', '鎌倉市', '藤沢市', '小田原市', '茅ヶ崎市', '厚木市'],
  '新潟県': ['新潟市', '長岡市', '三条市', '柏崎市', '新発田市', '小千谷市', '加茂市', '十日町市', '見附市', '村上市'],
  '富山県': ['富山市', '高岡市', '魚津市', '氷見市', '滑川市', '黒部市', '砺波市', '小矢部市', '南砺市', '射水市'],
  '石川県': ['金沢市', '七尾市', '小松市', '輪島市', '珠洲市', '加賀市', '羽咋市', 'かほく市', '白山市', '能美市'],
  '福井県': ['福井市', '敦賀市', '小浜市', '大野市', '勝山市', '鯖江市', 'あわら市', '越前市', '坂井市', '永平寺町'],
  '山梨県': ['甲府市', '富士吉田市', '都留市', '山梨市', '大月市', '韮崎市', '南アルプス市', '北杜市', '甲斐市', '笛吹市'],
  '長野県': ['長野市', '松本市', '上田市', '岡谷市', '飯田市', '諏訪市', '須坂市', '小諸市', '伊那市', '駒ヶ根市'],
  '岐阜県': ['岐阜市', '大垣市', '高山市', '多治見市', '関市', '中津川市', '美濃市', '瑞浪市', '羽島市', '恵那市'],
  '静岡県': ['静岡市', '浜松市', '沼津市', '熱海市', '三島市', '富士宮市', '伊東市', '島田市', '富士市', '磐田市'],
  '愛知県': ['名古屋市', '豊橋市', '岡崎市', '一宮市', '瀬戸市', '半田市', '春日井市', '豊川市', '津島市', '碧南市'],
  '三重県': ['津市', '四日市市', '伊勢市', '松阪市', '桑名市', '鈴鹿市', '名張市', '尾鷲市', '亀山市', '鳥羽市'],
  '滋賀県': ['大津市', '彦根市', '長浜市', '近江八幡市', '草津市', '守山市', '栗東市', '甲賀市', '野洲市', '湖南市'],
  '京都府': ['京都市', '福知山市', '舞鶴市', '綾部市', '宇治市', '宮津市', '亀岡市', '城陽市', '向日市', '長岡京市'],
  '大阪府': ['大阪市', '堺市', '岸和田市', '豊中市', '池田市', '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市'],
  '兵庫県': ['神戸市', '姫路市', '尼崎市', '明石市', '西宮市', '洲本市', '芦屋市', '伊丹市', '相生市', '豊岡市'],
  '奈良県': ['奈良市', '大和高田市', '大和郡山市', '天理市', '橿原市', '桜井市', '五條市', '御所市', '生駒市', '香芝市'],
  '和歌山県': ['和歌山市', '海南市', '橋本市', '有田市', '御坊市', '田辺市', '新宮市', '紀の川市', '岩出市', '有田郡'],
  '鳥取県': ['鳥取市', '米子市', '倉吉市', '境港市'],
  '島根県': ['松江市', '浜田市', '出雲市', '益田市', '大田市', '安来市', '江津市', '雲南市'],
  '岡山県': ['岡山市', '倉敷市', '津山市', '玉野市', '笠岡市', '井原市', '総社市', '高梁市', '新見市', '備前市'],
  '広島県': ['広島市', '呉市', '竹原市', '三原市', '尾道市', '福山市', '府中市', '三次市', '庄原市', '大竹市'],
  '山口県': ['下関市', '宇部市', '山口市', '萩市', '防府市', '下松市', '岩国市', '光市', '長門市', '柳井市'],
  '徳島県': ['徳島市', '鳴門市', '小松島市', '阿南市', '吉野川市', '阿波市', '美馬市', '三好市'],
  '香川県': ['高松市', '丸亀市', '坂出市', '善通寺市', '観音寺市', 'さぬき市', '東かがわ市', '三豊市'],
  '愛媛県': ['松山市', '今治市', '宇和島市', '八幡浜市', '新居浜市', '西条市', '大洲市', '伊予市', '四国中央市', '西予市'],
  '高知県': ['高知市', '室戸市', '安芸市', '南国市', '土佐市', '須崎市', '宿毛市', '土佐清水市', '四万十市', '香南市'],
  '福岡県': ['福岡市', '北九州市', '大牟田市', '久留米市', '直方市', '飯塚市', '田川市', '柳川市', '八女市', '筑後市'],
  '佐賀県': ['佐賀市', '唐津市', '鳥栖市', '多久市', '伊万里市', '武雄市', '鹿島市', '小城市', '嬉野市', '神埼市'],
  '長崎県': ['長崎市', '佐世保市', '島原市', '諫早市', '大村市', '平戸市', '松浦市', '対馬市', '壱岐市', '五島市'],
  '熊本県': ['熊本市', '八代市', '人吉市', '荒尾市', '水俣市', '玉名市', '山鹿市', '菊池市', '宇土市', '上天草市'],
  '大分県': ['大分市', '別府市', '中津市', '日田市', '佐伯市', '臼杵市', '津久見市', '竹田市', '豊後高田市', '杵築市'],
  '宮崎県': ['宮崎市', '都城市', '延岡市', '日南市', '小林市', '日向市', '串間市', '西都市', 'えびの市', '三股町'],
  '鹿児島県': ['鹿児島市', '鹿屋市', '枕崎市', '阿久根市', '出水市', '指宿市', '西之表市', '垂水市', '薩摩川内市', '日置市'],
  '沖縄県': ['那覇市', '宜野湾市', '石垣市', '浦添市', '名護市', '糸満市', '沖縄市', '豊見城市', 'うるま市', '宮古島市']
}

export default function AppHome() {
  const pathname = usePathname()
  const router = useRouter()
  const [view, setView] = useState<'main' | 'profile'>('main')
  
  // デバッグログ：viewステートの変更を追跡
  console.log("Current View State:", view)
  
  // viewが変更されたときのログ
  useEffect(() => {
    console.log("ビューが切り替わりました:", view)
  }, [view])
  const [mode, setMode] = useState<'local' | 'tourist'>('local') 
  const [selectedCityId, setSelectedCityId] = useState<string>('hikone')
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false)
  const [tempPref, setTempPref] = useState<string | null>(null)
  const [citySearchQuery, setCitySearchQuery] = useState<string>('')
  const [selectedDestinationName, setSelectedDestinationName] = useState<string>('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'ai', text: '何かお手伝いするニャ？' }])
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // プロフィール登録モーダル用のステート
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  
  // プロフィールページ用のステート
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false) // 初期値をfalseにして、ゲストモードで即座に表示できるようにする
  
  // 編集フォーム用のステート
  const [username, setUsername] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [prefecture, setPrefecture] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [saving, setSaving] = useState(false)
  
  // 都道府県リスト（プロフィール編集用：47都道府県+海外）
  const PREFECTURES = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県', '海外'
  ]
  
  // 海外の主要国リスト
  const COUNTRIES = [
    'アメリカ', 'イギリス', 'フランス', 'ドイツ', 'イタリア', 'スペイン',
    'カナダ', 'オーストラリア', 'ニュージーランド', '韓国', '中国', '台湾',
    'タイ', 'シンガポール', 'マレーシア', 'インドネシア', 'フィリピン',
    'インド', 'ブラジル', 'メキシコ', 'アルゼンチン', 'チリ', '南アフリカ',
    'エジプト', 'トルコ', 'ロシア', 'その他'
  ]

  useEffect(() => {
    const savedMode = localStorage.getItem('app_mode') as 'local' | 'tourist'
    if (savedMode) setMode(savedMode)
    const savedCity = localStorage.getItem('selected_city_id')
    if (savedCity) setSelectedCityId(savedCity)
    
    // 即座にセッションチェックを行い、未ログインの場合はローディングを解除
    // 注意: この関数内では view を変更しない（setView を一切呼ばない）
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
          // ホーム画面にいる場合のみプロフィールチェックを実行（viewを変更しない）
          // 初期ロード時は view が 'main' なので、この条件は true になる
          // ただし、この時点で既に 'profile' に切り替えられている場合は実行しない
          // 注意: checkProfileCompletion 内でも view を変更しないことを確認済み
          checkProfileCompletion()
        } else {
          // セッションがnull（未ログイン）の場合
          // 注意: view を変更しない（setView('main') を呼ばない）
          setCurrentUser(null)
          setProfileChecked(true)
        }
      } catch (error) {
        console.error('Session check error:', error)
        setCurrentUser(null)
      } finally {
        // 成否に関わらず、必ずローディングを解除（強制リセット）
        setProfileLoading(false)
      }
    }
    checkInitialSession()
    
    // 認証状態の変更を監視（シンプルに）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id || 'no user')
      
      // ユーザーを即座にセット（Loadingフラグに頼らない）
      setCurrentUser(session?.user ?? null)
      setProfileLoading(false)
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          // プロフィール作成処理（DBトリガーが動いていない場合の保険）
          createProfileIfNotExists(session.user)
          // ログイン後、即座にプロフィール情報を取得してStateにセット
          if (view === 'profile') {
            fetchProfileDataForEdit()
          }
          // 注意: viewを変更する処理は一切行わない
          // ホーム画面にいる場合のみプロフィールチェックを実行（viewを変更しない）
          if (view === 'main') {
            checkProfileCompletion()
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // ログアウト時：Stateをリセット（ただし、viewは変更しない）
        // viewの変更は、handleLogout関数内で明示的に実行する
        setProfile(null)
        setShowProfileModal(false)
        setProfileChecked(true)
        // setView('main')を削除：ログアウトボタンを押した時だけhandleLogoutで実行
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app_mode', mode)
    localStorage.setItem('selected_city_id', selectedCityId)
  }, [mode, selectedCityId])

  // URLクエリパラメータまたはパスからviewを設定
  // 注意: このuseEffectはpathnameが変更された時のみ実行される
  // 他のページから「会員情報」タブを押して/?view=profileに遷移した場合、このuseEffectが実行される
  useEffect(() => {
    // このページ（/）にいるときだけ実行
    if (pathname !== '/') {
      // 他のページにいる場合は何もしない（viewステートは変更しない）
      return
    }
    
    // クエリパラメータをチェック
    const viewParam = new URLSearchParams(window.location.search).get('view')
    if (viewParam === 'profile') {
      // クエリパラメータがprofileの場合は、profileビューに設定
      console.log("Setting view to 'profile' from URL param")
      setView('profile')
    }
    // 注意: viewParamがnullまたは''の場合は何もしない（勝手にmainに戻さない）
    // 初期ロード時の'main'はuseStateの初期値で設定されている
  }, [pathname]) // routerを依存配列から削除、viewも削除（無限ループを防ぐ）

  // currentUser がいない（ゲスト）の場合は、即座に profileLoading を false にする
  useEffect(() => {
    if (!currentUser) {
      setProfileLoading(false)
    }
  }, [currentUser])

  // プロフィールページが表示されたときにデータを取得
  useEffect(() => {
    if (view === 'profile') {
      // ゲスト判定のログ（デバッグ用）
      console.log("DEBUG: currentUser is", currentUser)
      console.log("View:", view, "User:", !!currentUser, "ProfileLoading:", profileLoading)
      
      // ログイン状態を確認
      const checkAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setCurrentUser(session.user)
            fetchProfileDataForEdit()
          } else {
            // セッションがない場合
            setCurrentUser(null)
          }
        } catch (error) {
          console.error('Auth check error:', error)
          setCurrentUser(null)
        } finally {
          // 成否に関わらず、必ずローディングを解除（強制リセット）
          setProfileLoading(false)
        }
      }
      checkAuth()
    }
  }, [view])

  // プロフィールの完了状況をチェック（ページ読み込み完了時に1回だけ実行）
  const checkProfileCompletion = async () => {
    try {
      // まず、チェック完了前はモーダルを表示しない
      setShowProfileModal(false)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      // ゲスト（未ログイン）時: ポップアップは絶対に表示しない
      if (!session?.user) {
        setShowProfileModal(false)
        setProfileChecked(true)
        return
      }
      
      setCurrentUser(session.user)
      
      // プロフィール情報を取得
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, gender, age_range, residence, interests')
        .eq('id', session.user.id)
        .single()
      
      // デバッグ用ログ
      console.log('=== プロフィールチェック開始 ===')
      console.log('Current Profile Data:', profile)
      console.log('Supabase Error:', error)
      
      // エラーハンドリング（データが存在しない場合のエラー PGRST116 などを処理）
      if (error) {
        // PGRST116 は「データが存在しない」エラー（これは正常なケース）
        if (error.code === 'PGRST116') {
          console.log('プロフィールが見つかりません（新規ユーザー）')
          // ホーム画面にいる場合のみモーダルを表示
          if (view === 'main') {
            console.log('Should Show Modal?: true (プロフィール未登録、ホーム画面)')
            setShowProfileModal(true)
          } else {
            console.log('Should Show Modal?: false (プロフィール未登録だが、ホーム画面ではない)')
            setShowProfileModal(false)
          }
          return
        } else {
          // その他のエラー
          console.error('プロフィール取得エラー:', error)
          setShowProfileModal(false)
          return
        }
      }
      
      // プロフィールが存在しない場合
      if (!profile) {
        console.log('プロフィールデータが null/undefined')
        // ホーム画面にいる場合のみモーダルを表示
        if (view === 'main') {
          console.log('Should Show Modal?: true (プロフィール未登録、ホーム画面)')
          setShowProfileModal(true)
        } else {
          console.log('Should Show Modal?: false (プロフィール未登録だが、ホーム画面ではない)')
          setShowProfileModal(false)
        }
        return
      }
      
      // プロフィールが存在する場合の判定
      // full_name の厳密なチェック（空文字、null、undefined を除外）
      const hasFullName = profile.full_name && 
                         profile.full_name !== '' && 
                         profile.full_name !== null && 
                         profile.full_name !== undefined
      
      // age_range の厳密なチェック
      const hasAgeRange = profile.age_range && 
                         profile.age_range !== '' && 
                         profile.age_range !== null && 
                         profile.age_range !== undefined
      
      // residence の厳密なチェック
      const hasResidence = profile.residence && 
                          profile.residence !== '' && 
                          profile.residence !== null && 
                          profile.residence !== undefined
      
      // 詳細情報（年代、居住地のいずれか）が入力されているかチェック
      const hasDetails = hasAgeRange || hasResidence
      
      console.log('hasFullName:', hasFullName, '| value:', profile.full_name)
      console.log('hasAgeRange:', hasAgeRange, '| value:', profile.age_range)
      console.log('hasResidence:', hasResidence, '| value:', profile.residence)
      console.log('hasDetails:', hasDetails)
      
      // ログイン済み かつ プロフィール未入力時: ホーム画面にのみ、登録を促すポップアップを1回だけ表示
      if (!hasFullName || !hasDetails) {
        // プロフィールが未入力または不完全な場合
        if (view === 'main') {
          console.log('Should Show Modal?: true (プロフィール未入力、ホーム画面)')
          setShowProfileModal(true)
        } else {
          console.log('Should Show Modal?: false (プロフィール未入力だが、ホーム画面ではない)')
          setShowProfileModal(false)
        }
      } else {
        // プロフィールが既に入力されている場合はモーダルを表示しない
        console.log('Should Show Modal?: false (プロフィール入力済み)')
        setShowProfileModal(false)
      }
      
      console.log('=== プロフィールチェック完了 ===')
    } catch (error) {
      // try-catch でキャッチされる予期しないエラー
      console.error('Profile check error (catch):', error)
      setShowProfileModal(false)
    } finally {
      // チェックが完了したことを示す（エラーが発生しても必ず実行される）
      setProfileChecked(true)
      console.log('Profile check completed. profileChecked = true')
    }
  }

  // プロフィールデータの取得
  const fetchProfileData = async () => {
    try {
      setProfileLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setProfileLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setProfile(data)
      } else {
        // プロフィールがない場合でも、セッション情報を表示
        setProfile({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー',
          email: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || null
        })
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  // 編集用のプロフィールデータ取得（Stateに反映）
  const fetchProfileDataForEdit = async () => {
    try {
      setProfileLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setProfileLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setProfile(data)
        // 編集フォームのStateに反映
        setUsername(data.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー')
        setAvatarUrl(data.avatar_url || session.user.user_metadata?.avatar_url || '')
        setPrefecture(data.prefecture || '')
        setCity(data.city || '')
      } else {
        // プロフィールがない場合
        const defaultName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー'
        setProfile({
          id: session.user.id,
          full_name: defaultName,
          email: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || null
        })
        setUsername(defaultName)
        setAvatarUrl(session.user.user_metadata?.avatar_url || '')
        setPrefecture('')
        setCity('')
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  // プロフィールが存在しない場合に作成する（DBトリガーの保険）
  const createProfileIfNotExists = async (user: any) => {
    try {
      // 既存のプロフィールをチェック
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // プロフィールが存在しない場合、作成
        console.log('プロフィールが存在しないため作成します:', user.id)
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
            avatar_url: user.user_metadata?.avatar_url || null,
            last_login: new Date().toISOString()
          })
          .select()

        if (error) {
          console.error('プロフィール作成エラー:', error)
        } else {
          console.log('プロフィールを作成しました:', data)
        }
      }
    } catch (error) {
      console.error('プロフィール作成チェックエラー:', error)
    }
  }

  // ポップアップをキャンセルする処理
  const handleCancelCitySelection = () => {
    setIsCitySelectorOpen(false)
    setTempPref(null)
    setCitySearchQuery('')
    setSelectedDestinationName('')
    // 観光モードをOFFに戻す
    setMode('local')
    // ひこにゃんメッセージを表示
    alert('お出かけはやめるのかニャ？地元でゆっくりするのもいいニャ！')
  }

  const handleToggleMode = () => {
    if (mode === 'local') {
      // 観光モードに切り替える場合は、まずポップアップを開く
      // 目的地が選択されるまではmodeは'tourist'にしない（pending状態）
      setIsCitySelectorOpen(true)
    } else {
      // 地元モードに戻す
      setMode('local')
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) {
      console.error('Googleログインエラー:', error)
      alert('ログインに失敗しました。もう一度お試しください。')
    }
  }

  // プロフィール保存処理
  const handleSaveProfile = async () => {
    if (!currentUser) {
      alert('ログインが必要です')
      return
    }

    if (!username.trim()) {
      alert('ユーザー名を入力してください')
      return
    }

    // 都道府県が選択されている場合は市区町村も必須
    if (prefecture && prefecture !== '海外' && !city.trim()) {
      alert('市区町村を選択してください')
      return
    }

    // 海外が選択されている場合は国名も必須
    if (prefecture === '海外' && !city.trim()) {
      alert('国名を選択してください')
      return
    }

    setSaving(true)

    try {
      // 保存用データの準備
      const updateData: any = {
        id: currentUser.id,
        full_name: username.trim(),
        updated_at: new Date().toISOString()
      }

      // オプショナルフィールドの設定
      if (avatarUrl.trim()) {
        updateData.avatar_url = avatarUrl.trim()
      } else {
        updateData.avatar_url = null
      }

      if (prefecture && prefecture.trim()) {
        updateData.prefecture = prefecture.trim()
      } else {
        updateData.prefecture = null
      }

      if (city && city.trim()) {
        updateData.city = city.trim()
      } else {
        updateData.city = null
      }

      console.log('保存データ:', updateData)

      const { data, error } = await supabase
        .from('profiles')
        .upsert(updateData, {
          onConflict: 'id'
        })
        .select()

      if (error) {
        console.error('Profile upsert error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`保存に失敗しました: ${error.message}\n詳細はコンソールを確認してください。\nprefectureとcityカラムが存在するか確認してください。`)
      } else {
        console.log('保存成功:', data)
        alert('保存したニャ！')
        // 画面上の名前を即座に更新
        setProfile((prev: any) => ({
          ...prev,
          full_name: username.trim(),
          avatar_url: avatarUrl.trim() || null,
          prefecture: prefecture || null,
          city: city.trim() || null
        }))
        // プロフィール情報を再取得
        await fetchProfileDataForEdit()
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      console.error('Error stack:', error?.stack)
      alert(`予期しないエラーが発生しました: ${error?.message || '不明なエラー'}\n詳細はコンソールを確認してください。`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await supabase.auth.signOut()
      setProfile(null)
      setCurrentUser(null)
      setView('main')
      setUsername('')
      setAvatarUrl('')
      setPrefecture('')
      setCity('')
    }
  }

  const currentCity = cityData[selectedCityId] || cityData['hikone']

  return (
    <div className="h-screen bg-blue-50/30 font-sans flex flex-col text-gray-800 tracking-tight overflow-hidden">
      
      {/* --- ヘッダー：コンパクト化したスイッチ --- */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 border-b border-gray-100 shadow-sm z-[110]">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div 
            onClick={() => setIsChatOpen(true)}
            className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <img src={HIKONYAN_IMAGE} className="w-5 h-5" />
            <span className="text-[11px] font-bold text-gray-400">ひこにゃんAIに質問...</span>
          </div>

          {/* スライドスイッチ（コンパクト版） */}
          <div 
            onClick={handleToggleMode}
            className={`relative w-20 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              mode === 'local' ? 'bg-blue-500' : 'bg-orange-500'
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${
              mode === 'local' ? 'translate-x-0' : 'translate-x-12'
            }`}>
              {mode === 'local' ? <Building2 size={12} className="text-blue-500" /> : <MapIcon size={12} className="text-orange-500" />}
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[9px] font-black text-white pointer-events-none uppercase">
              <span className={mode === 'local' ? 'opacity-0' : 'opacity-100'}>観光</span>
              <span className={mode === 'local' ? 'opacity-100' : 'opacity-0'}>地元</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- メインコンテンツ --- */}
      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {/* 条件付きレンダリングを1箇所に集約（ガードなし） */}
        {view === 'main' && (
          /* ホームコンテンツ */
          <div className="max-w-xl mx-auto animate-in fade-in duration-500">
            <div className={`bg-gradient-to-br ${mode === 'local' ? 'from-blue-500 to-indigo-600' : currentCity.color} rounded-[2.5rem] p-8 text-white shadow-xl mb-8 relative overflow-hidden transition-all duration-500`}>
              <div className="relative z-10">
                <p className="text-5xl font-black mb-2 tracking-tighter">12°C</p>
                <p className="font-bold text-lg">{mode === 'local' ? '彦根市は今日も快晴ニャ！' : `${currentCity.name}を満喫してニャ！`}</p>
              </div>
              <Sun size={140} className="absolute -right-6 -bottom-6 opacity-20 rotate-12" />
            </div>

            {mode === 'local' ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-4 border border-white">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24}/></div>
                <div><h3 className="font-black text-gray-800">明日のゴミ収集</h3><p className="text-sm text-gray-400 font-bold">燃やせるゴミの日ニャ</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1"><h2 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Tourism</h2><button onClick={() => setIsCitySelectorOpen(true)} className="text-[10px] font-black text-orange-500 bg-white px-3 py-1 rounded-full border">街を変更</button></div>
                <div className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Utensils size={20}/></div>
                  <div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase">Eating</p><p className="font-black text-gray-800">{currentCity.food}</p></div>
                  <ChevronRight size={18} className="text-gray-200" />
                </div>
              </div>
            )}
          </div>
        )}
        
        {view === 'profile' && (
          !currentUser ? (
            /* 未ログインなら、このログイン画面を強制表示 */
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in max-w-xl mx-auto">
              <div className="bg-orange-50 p-6 rounded-full mb-6">
                <img src={HIKONYAN_IMAGE} className="w-24 h-24 object-contain" alt="ひこにゃん" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">ログインしてニャ！</h2>
              <p className="text-gray-500 mb-8 font-medium">
                会員登録すると、プロフィールの保存や<br/>あなたに合わせた情報が見れるようになるニャ。
              </p>
              <button 
                onClick={handleGoogleLogin} 
                className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border-2 border-gray-200 py-4 rounded-2xl font-black shadow-sm active:scale-95 transition-all hover:bg-gray-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </button>
            </div>
          ) : (
            /* ログイン済みなら編集フォームを直接表示（ProfileEditView） */
            <div className="p-6 animate-in slide-in-from-bottom-4 max-w-xl mx-auto">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin text-4xl mb-4">🐱</div>
                  <p className="font-black text-gray-400">読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* プロフィール編集フォーム */}
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                      <Edit size={24} className="text-orange-500" />
                      プロフィール編集
                    </h3>

                    {/* ユーザー名入力欄 */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">ユーザー名</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                          placeholder="ユーザー名を入力"
                        />
                      </div>
                    </div>

                    {/* アイコン画像URL入力欄（オプション） */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">アイコン画像URL（任意）</span>
                      </label>
                      <div className="relative">
                        <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                          placeholder="https://example.com/avatar.png"
                        />
                      </div>
                      {avatarUrl && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <img 
                            src={avatarUrl} 
                            alt="プレビュー" 
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <span className="text-xs font-bold text-gray-500">プレビュー</span>
                        </div>
                      )}
                    </div>

                    {/* 居住地：都道府県選択 */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">どこの街から来たのか教えてニャ！</span>
                      </label>
                      <p className="text-xs text-gray-500 font-bold ml-2 mb-2">まず都道府県を選んでニャ</p>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <select
                          value={prefecture}
                          onChange={(e) => {
                            setPrefecture(e.target.value)
                            // 都道府県が変更されたら市区町村をリセット
                            setCity('')
                          }}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                        >
                          <option value="">都道府県を選択してください</option>
                          {PREFECTURES.map((pref) => (
                            <option key={pref} value={pref}>{pref}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 居住地：市区町村選択（都道府県が選択されている場合のみ表示） */}
                    {prefecture && prefecture !== '海外' && PREFECTURE_CITIES[prefecture] && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 ml-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">市区町村を選んでニャ</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            required
                          >
                            <option value="">市区町村を選択してください</option>
                            {PREFECTURE_CITIES[prefecture].map((cityName) => (
                              <option key={cityName} value={cityName}>{cityName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 居住地：国名選択（海外が選択された場合のみ表示） */}
                    {prefecture === '海外' && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 ml-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">国名を選んでニャ</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            required
                          >
                            <option value="">国名を選択してください</option>
                            {COUNTRIES.map((country) => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 保存ボタン */}
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !username.trim()}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin">🐱</div>
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <Edit size={20} />
                          <span>保存するニャ！</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 現在のプロフィール情報（参考表示） */}
                  {profile && (
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          {profile?.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt={profile.full_name || 'ユーザー'} 
                              className="w-20 h-20 rounded-full border-4 border-white/30 object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                              <UserCircle size={40} className="text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h2 className="text-2xl font-black mb-1">
                              {profile?.full_name || 'ユーザー'}
                            </h2>
                            {profile?.email && (
                              <p className="text-sm text-white/80 font-bold flex items-center gap-1">
                                <Mail size={14} />
                                {profile.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ログアウトボタン */}
                  <div className="pt-4 pb-8">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors py-3"
                    >
                      <LogOut size={18} />
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>


      {/* --- チャット画面（下からスライドアニメーション） --- */}
      {isChatOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div 
            className="fixed inset-0 z-[1999] bg-black/40 animate-fade-in"
            onClick={() => setIsChatOpen(false)}
          />
          {/* チャット画面 */}
          <div className="fixed inset-0 z-[2000] flex flex-col bg-white animate-slide-up">
          {/* ヘッダー */}
          <div className="flex-shrink-0 p-4 border-b flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <img src={HIKONYAN_IMAGE} className="w-8 h-8" />
              <p className="font-black text-gray-800 text-sm">ひこにゃんAI</p>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
          </div>
          
          {/* メッセージエリア（スクロール可能） */}
          <div className="flex-1 min-h-0 p-4 bg-gray-50 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-[13px] font-bold ${msg.role === 'user' ? 'bg-red-500 text-white' : 'bg-white border border-gray-100 text-gray-700'}`}>{msg.text}</div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* 入力エリア（固定、最下部に配置） */}
          <div className="flex-shrink-0 p-4 border-t bg-white safe-area-inset-bottom">
            <div className="max-w-xl mx-auto bg-gray-100 rounded-full px-4 py-2.5 flex items-center gap-3 border border-gray-200">
              <input 
                autoFocus
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setMessages([...messages, { role: 'user', text: chatInput }]), setChatInput(''))}
                className="bg-transparent flex-1 outline-none font-bold text-sm" 
                placeholder="メッセージを入力ニャ..." 
              />
              <button onClick={() => { if(!chatInput.trim()) return; setMessages([...messages, { role: 'user', text: chatInput }]); setChatInput(''); }} className="text-red-500"><Send size={20}/></button>
            </div>
          </div>
          </div>
        </>
      )}

      {/* 街選択ポップアップ（全国対応） */}
      {isCitySelectorOpen && (
        <>
          {/* Backdrop - クリックでキャンセル */}
          <div 
            className="fixed inset-0 z-[2499] bg-black/60 backdrop-blur-md"
            onClick={handleCancelCitySelection}
          />
          <div className="fixed inset-0 z-[2500] flex items-end justify-center pointer-events-none">
            <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom max-h-[90vh] flex flex-col pointer-events-auto">
              {/* ヘッダー */}
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-black">どこへ行くニャ？</h3>
                  {selectedDestinationName && (
                    <p className="text-sm text-orange-500 font-bold mt-1">
                      {selectedDestinationName}は良いところだニャ〜！
                    </p>
                  )}
                </div>
                <button 
                  onClick={handleCancelCitySelection}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>

            {/* コンテンツエリア（スクロール可能） */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {!tempPref ? (
                /* 都道府県選択 */
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-500 mb-4">次はどこへお出かけするニャ？都道府県を選んでニャ！</p>
                  {/* 都道府県検索 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="都道府県を検索..."
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-3 pl-12 pr-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                    />
                  </div>
                  {/* 都道府県リスト */}
                  <div className="space-y-2">
                    {ALL_PREFECTURES.filter(pref => 
                      !citySearchQuery || pref.includes(citySearchQuery)
                    ).map(pref => (
                      <button 
                        key={pref} 
                        onClick={() => {
                          setTempPref(pref)
                          setCitySearchQuery('')
                        }} 
                        className="w-full p-4 bg-gray-50 hover:bg-orange-50 rounded-2xl font-black flex justify-between items-center transition-all hover:scale-[1.02]"
                      >
                        <span>{pref}</span>
                        <ChevronRight size={18} className="text-gray-400"/>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* 市区町村選択 */
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => {
                        setTempPref(null)
                        setCitySearchQuery('')
                      }}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <ChevronRight size={18} className="rotate-180 text-gray-600"/>
                    </button>
                    <h4 className="text-lg font-black text-gray-800">{tempPref}</h4>
                  </div>
                  
                  {/* 市区町村検索 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="市区町村を検索..."
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-3 pl-12 pr-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                    />
                  </div>

                  {/* 市区町村リスト */}
                  <div className="space-y-2">
                    {(PREFECTURE_CITIES[tempPref] || []).filter(city => 
                      !citySearchQuery || city.includes(citySearchQuery)
                    ).map(city => (
                      <button 
                        key={city} 
                        onClick={() => {
                          const cityKey = city.toLowerCase().replace(/[市県区]/g, '')
                          // cityDataに存在しない場合は、新しいエントリを作成
                          if (!cityData[cityKey]) {
                            cityData[cityKey] = {
                              name: city,
                              food: '名物料理',
                              move: '交通情報',
                              shop: 'おすすめスポット',
                              color: 'from-orange-500 to-red-600'
                            }
                          }
                          setSelectedCityId(cityKey)
                          setSelectedDestinationName(city)
                          // 目的地が確定したので、観光モードに切り替える
                          setMode('tourist')
                          // メッセージを表示してからポップアップを閉じる
                          setTimeout(() => {
                            setIsCitySelectorOpen(false)
                            setTempPref(null)
                            setCitySearchQuery('')
                            // ポップアップが閉じた後にメッセージをクリア
                            setTimeout(() => {
                              setSelectedDestinationName('')
                            }, 2000)
                          }, 800)
                        }} 
                        className="w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black flex justify-between items-center shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <span>{city}</span>
                        <Sparkles size={18}/>
                      </button>
                    ))}
                    {/* 自由入力オプション（検索に該当しない場合） */}
                    {citySearchQuery && !PREFECTURE_CITIES[tempPref]?.some(city => city.includes(citySearchQuery)) && (
                      <button
                        onClick={() => {
                          const cityName = citySearchQuery.trim()
                          if (cityName) {
                            const cityKey = cityName.toLowerCase().replace(/[市県区]/g, '')
                            cityData[cityKey] = {
                              name: cityName,
                              food: '名物料理',
                              move: '交通情報',
                              shop: 'おすすめスポット',
                              color: 'from-orange-500 to-red-600'
                            }
                            setSelectedCityId(cityKey)
                            setSelectedDestinationName(cityName)
                            // 目的地が確定したので、観光モードに切り替える
                            setMode('tourist')
                            // メッセージを表示してからポップアップを閉じる
                            setTimeout(() => {
                              setIsCitySelectorOpen(false)
                              setTempPref(null)
                              setCitySearchQuery('')
                              // ポップアップが閉じた後にメッセージをクリア
                              setTimeout(() => {
                                setSelectedDestinationName('')
                              }, 2000)
                            }, 800)
                          }
                        }}
                        className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black flex justify-between items-center shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <span>「{citySearchQuery}」を追加する</span>
                        <Sparkles size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </>
      )}

      {/* プロフィール登録・編集モーダル */}
      {/* 
        表示条件:
        1. ローディング完了後（profileChecked === true）
        2. モーダル表示フラグがtrue（showProfileModal === true）
        3. ログイン済み（currentUser が存在）
        4. ホーム画面にいる（view === 'main'）← 重要：ホーム画面でのみ表示
        z-index: z-[110] でナビバー（z-[100]）より前面に表示
      */}
      {profileChecked && showProfileModal && currentUser && view === 'main' && (
        <ProfileRegistrationModal
          userId={currentUser.id}
          userEmail={currentUser.email}
          userFullName={currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profile?.full_name}
          onComplete={() => {
            // 保存成功後、モーダルを閉じてプロフィールを再チェック
            setShowProfileModal(false)
            // ホーム画面にいる場合のみ再チェック（これにより、次回はモーダルが表示されない）
            if (view === 'main') {
              checkProfileCompletion()
            } else if (view === 'profile') {
              fetchProfileData() // プロフィールページのデータも更新
            }
          }}
        />
      )}

      {/* --- 下部ナビゲーション（app/page.tsx内で管理） --- */}
      <BottomNavigation 
        currentView={view}
        onViewChange={(newView) => {
          // 強制移動ルール：ただのスイッチとして動作
          // 他の条件判定を一切挟まず、ただviewを変更するだけ
          console.log("ナビバー切り替え:", newView)
          setIsChatOpen(false) // チャットが開いていたら閉じるだけ
          setView(newView) // これだけ実行（リダイレクトや条件分岐なし）
        }}
        onNavigate={() => {
          setIsChatOpen(false) // 他のページに遷移する時もチャットを閉じる
        }}
      />
    </div>
  )
}