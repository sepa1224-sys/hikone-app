'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Sun, Send, X, UserCircle, Sparkles, Building2, Map as MapIcon, 
  ChevronRight, LogOut, Edit, Mail, MapPin, User, Search,
  Cloud, CloudRain, CloudSun, Droplets, Wind, Ticket, Gift, CalendarDays, PartyPopper, ShoppingBag,
  Camera, Trophy, Target, CheckCircle, Star, Coffee, Utensils, Castle, Mountain, 
  Heart, ShoppingCart, Bike, Upload, Award, MessageSquare
} from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'
import WasteScheduleCard, { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'
import { useWasteSchedule, prefetchWasteSchedule } from '@/lib/hooks/useWasteSchedule'
import { usePoints } from '@/lib/hooks/usePoints'
import { useMunicipalityStats } from '@/lib/hooks/useMunicipalityStats'
import { formatFullLocation, isSupportedCity, UNSUPPORTED_AREA_MESSAGE } from '@/lib/constants/shigaRegions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

const cityData: Record<string, any> = {
  hikone: { name: '彦根市', food: '近江ちゃんぽん', move: 'ご城下巡回バス', shop: '四番町スクエア', color: 'from-orange-500 to-red-600' },
  nagahama: { name: '長浜市', food: '焼鯖そうめん', move: '北国街道さんぽ', shop: '黒壁スクエア', color: 'from-blue-600 to-cyan-500' },
  tsuruga: { name: '敦賀市', food: '越前ガニ', move: 'ぐるっと敦賀周遊バス', shop: '日本海さかな街', color: 'from-emerald-600 to-teal-500' }
}

// 時系列天気データ（モック）
const HOURLY_WEATHER = [
  { time: '今', temp: 12, icon: Sun, precipitation: 0 },
  { time: '10時', temp: 14, icon: Sun, precipitation: 0 },
  { time: '11時', temp: 15, icon: CloudSun, precipitation: 0 },
  { time: '12時', temp: 16, icon: CloudSun, precipitation: 10 },
  { time: '13時', temp: 17, icon: Cloud, precipitation: 20 },
  { time: '14時', temp: 16, icon: Cloud, precipitation: 30 },
  { time: '15時', temp: 15, icon: CloudRain, precipitation: 50 },
  { time: '16時', temp: 14, icon: CloudRain, precipitation: 60 },
  { time: '17時', temp: 13, icon: Cloud, precipitation: 40 },
  { time: '18時', temp: 12, icon: Cloud, precipitation: 20 },
  { time: '19時', temp: 11, icon: CloudSun, precipitation: 10 },
  { time: '20時', temp: 10, icon: Sun, precipitation: 0 },
]

// クーポン情報（モック）
const COUPONS = [
  { id: 1, shop: 'せんなり亭', discount: '10%OFF', description: 'ランチメニュー全品', expires: '1/31まで', color: 'from-orange-500 to-red-500' },
  { id: 2, shop: 'カフェ琵琶湖', discount: 'ドリンク1杯無料', description: 'ケーキセット注文で', expires: '1/25まで', color: 'from-emerald-500 to-teal-500' },
  { id: 3, shop: '彦根銀座商店街', discount: '500円引き', description: '2,000円以上お買い上げで', expires: '2/10まで', color: 'from-purple-500 to-pink-500' },
]

// イベント情報（モック）
const EVENTS = [
  { id: 1, title: '彦根城 梅まつり', date: '2/1〜3/15', location: '彦根城', category: 'お祭り', icon: PartyPopper },
  { id: 2, title: '湖東地域フリーマーケット', date: '1/28(日)', location: '彦根市民会館', category: 'イベント', icon: ShoppingBag },
  { id: 3, title: '確定申告相談会', date: '2/16〜3/15', location: '市役所1F', category: '行政', icon: CalendarDays },
  { id: 4, title: 'ひこにゃん誕生祭', date: '4/13', location: '彦根城 天守前', category: 'お祭り', icon: Gift },
]

// マンスリーチャレンジのミッション（モック）
const MONTHLY_MISSIONS = [
  { id: 1, title: '彦根城で記念撮影', description: '彦根城の天守閣をバックに写真を撮影しよう！', icon: Castle, location: '彦根城', points: 100 },
  { id: 2, title: '近江牛ランチ', description: '対象店舗で近江牛ランチを食べよう', icon: Utensils, location: 'せんなり亭', points: 150 },
  { id: 3, title: 'カフェでひとやすみ', description: '四番町のカフェでドリンクを注文', icon: Coffee, location: '四番町スクエア', points: 80 },
  { id: 4, title: 'ひこにゃんに会う', description: 'ひこにゃんと一緒に写真を撮ろう', icon: Heart, location: '彦根城周辺', points: 200 },
  { id: 5, title: '琵琶湖サイクリング', description: '彦根港〜長浜の湖岸をサイクリング', icon: Bike, location: '琵琶湖岸', points: 120 },
  { id: 6, title: '地元スーパーでお買い物', description: '平和堂で1,000円以上お買い物', icon: ShoppingCart, location: '平和堂彦根店', points: 50 },
  { id: 7, title: '佐和山登山', description: '佐和山（232m）の山頂で写真撮影', icon: Mountain, location: '佐和山', points: 180 },
  { id: 8, title: 'スタンプラリー完走', description: '彦根駅〜彦根城のスタンプを全て集める', icon: Star, location: '彦根市内', points: 100 },
  { id: 9, title: '地元グルメ投稿', description: '彦根グルメの写真をSNSに投稿', icon: Camera, location: '彦根市内', points: 60 },
  { id: 10, title: '観光案内所訪問', description: '彦根観光案内所でパンフレットをゲット', icon: MapPin, location: '彦根駅前', points: 30 },
]

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
  
  // 経路検索用のステート
  const [startPoint, setStartPoint] = useState<string>('彦根駅')
  const [goalPoint, setGoalPoint] = useState<string>('京都駅')
  const [departureDateTime, setDepartureDateTime] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })
  const [routes, setRoutes] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // プロフィール登録モーダル用のステート
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  
  // プロフィールページ用のステート
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false) // 初期値をfalseにして、ゲストモードで即座に表示できるようにする
  
  // ユーザーの登録都市（ホーム画面のパーソナライズ用）
  const [userCity, setUserCity] = useState<string | null>(null)
  // ユーザーの選択エリア（profiles.selected_area）
  const [userSelectedArea, setUserSelectedArea] = useState<string | null>(null)
  // ユーザーの会員番号（join_order）
  const [userJoinOrder, setUserJoinOrder] = useState<number | null>(null)
  // エリア未対応ガード用のステート（ログイン済みかつ対応エリア外の場合に表示）
  const [showUnsupportedAreaModal, setShowUnsupportedAreaModal] = useState(false)
  
  // デバッグ: userCity と userSelectedArea の値を追跡
  useEffect(() => {
    console.log('🔄 [Home] State変更検知:', {
      userCity,
      userSelectedArea,
      currentUserId: currentUser?.id
    })
  }, [userCity, userSelectedArea, currentUser?.id])
  
  // SWRでゴミ収集スケジュールをキャッシュ付きで取得
  // ※ userSelectedArea が変更されると、SWRのキーが変わり自動的に再フェッチされる
  const { wasteSchedule: swrWasteSchedule, isLoading: wasteLoading, refetch: refetchWaste } = useWasteSchedule(userSelectedArea)
  
  // SWRでポイント情報をキャッシュ付きで取得
  const { points: userPoints, referralCode, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)
  
  // SWRで自治体の人口・登録者数を取得（currentUser?.idを渡して自分がカウントに含まれているか確認）
  // ※ userCity が変更されると、SWRのキーが変わり自動的に再フェッチされる
  const { stats: municipalityStats, isLoading: statsLoading, refetch: refetchStats } = useMunicipalityStats(userCity, currentUser?.id)
  
  // フォトコンテストイベント（events テーブルから取得）
  const [activeEvent, setActiveEvent] = useState<{
    id: string
    title: string
    prize_amount: number
    end_date: string
  } | null>(null)
  
  // マンスリーチャレンジ用のステート
  const [completedMissions, setCompletedMissions] = useState<number[]>([1, 3, 6]) // デモ用：いくつかクリア済み
  const [selectedMission, setSelectedMission] = useState<typeof MONTHLY_MISSIONS[0] | null>(null)
  const [missionModalOpen, setMissionModalOpen] = useState(false)
  const [missionPhoto, setMissionPhoto] = useState<File | null>(null)
  const [missionPhotoPreview, setMissionPhotoPreview] = useState<string | null>(null)
  const [uploadingMission, setUploadingMission] = useState(false)
  const missionFileInputRef = useRef<HTMLInputElement>(null)
  
  // 編集フォーム用のステート
  const [username, setUsername] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [prefecture, setPrefecture] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<string>('') // エリア選択用
  const [saving, setSaving] = useState(false)
  
  // 彦根市のエリアリスト（hikone_waste_master の area_name に対応）
  const HIKONE_AREAS = [
    '河瀬・亀山・稲枝東・稲枝北・稲枝西',
    '旭森・鳥居本・佐和山',
    '平田・金城',
    '城西',
    '城南・城陽・若葉・高宮',
    '城東・城北'
  ]
  
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
        console.log('🔐 [Home] セッション確認:', session ? `User: ${session.user.id}` : 'なし')
        
        if (session?.user) {
          setCurrentUser(session.user)
          
          // ユーザーの登録都市・エリア・会員番号を取得（ホーム画面のパーソナライズ用）
          // ※ selected_area と detail_area の両方を取得（互換性のため）
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('city, selected_area, detail_area, join_order')
            .eq('id', session.user.id)
            .single()
          
          console.log('📋 [Home] プロフィール取得結果:', profileData)
          if (profileError) {
            console.error('📋 [Home] プロフィール取得エラー:', profileError)
          }
          
          // ===== 市区町村の設定（必ず実行） =====
          const cityValue = profileData?.city || null
          setUserCity(cityValue)
          console.log(`🏙️ [Home] ユーザーの市区町村を設定: ${cityValue || '(未設定)'}`)
          
          if (cityValue) {
            // ===== 対応エリアチェック =====
            // city が設定されている場合、対応エリアかどうかをチェック
            if (!isSupportedCity(cityValue)) {
              console.log(`⚠️ [Home] 未対応エリア: ${cityValue}`)
              setShowUnsupportedAreaModal(true)
            } else {
              console.log(`✅ [Home] 対応エリア: ${cityValue}`)
              setShowUnsupportedAreaModal(false)
            }
          } else {
            // city が null の場合はモーダルを表示しない
            setShowUnsupportedAreaModal(false)
          }
          
          // ===== エリアの設定（必ず実行） =====
          // エリアの判定: selected_area または detail_area を使用
          const areaValue = profileData?.selected_area || profileData?.detail_area || null
          setUserSelectedArea(areaValue)
          console.log('🗑️ [Home] 判定に使用しているエリア名:', areaValue || '(未設定)')
          console.log('🗑️ [Home] selected_area:', profileData?.selected_area)
          console.log('🗑️ [Home] detail_area:', profileData?.detail_area)
          
          if (areaValue) {
            console.log(`✅ [Home] ゴミ収集エリア設定完了: ${areaValue}`)
          } else {
            console.log(`⚠️ [Home] ユーザーのエリアが未設定です（selected_area も detail_area も null）`)
          }
          
          // ===== 会員番号の設定 =====
          const joinOrderValue = profileData?.join_order || null
          setUserJoinOrder(joinOrderValue)
          if (joinOrderValue) {
            console.log(`🎫 [Home] 会員番号: ${joinOrderValue}`)
          }
          
          // ホーム画面にいる場合のみプロフィールチェックを実行（viewを変更しない）
          checkProfileCompletion()
        } else {
          // セッションがnull（未ログイン）の場合
          console.log('🔐 [Home] 未ログイン状態')
          setCurrentUser(null)
          setProfileChecked(true)
          setUserCity(null)
          setUserSelectedArea(null)
          // SWR は userSelectedArea が null になると自動的にフェッチを停止
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id || 'no user')
      
      // ユーザーを即座にセット（Loadingフラグに頼らない）
      setCurrentUser(session?.user ?? null)
      setProfileLoading(false)
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          // プロフィール作成処理（DBトリガーが動いていない場合の保険）
          createProfileIfNotExists(session.user)
          
          // ===== ログイン後、プロフィール情報を取得してStateにセット =====
          console.log('🔄 [Home] ログイン後、プロフィール情報を再取得...')
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('city, selected_area, detail_area, join_order')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('📋 [Home] onAuthStateChange: プロフィール取得エラー:', profileError)
          } else {
            console.log('📋 [Home] onAuthStateChange: プロフィール取得成功:', profileData)
            
            // 市区町村を設定
            const cityValue = profileData?.city || null
            setUserCity(cityValue)
            console.log(`🏙️ [Home] onAuthStateChange: 市区町村を設定: ${cityValue || '(未設定)'}`)
            
            // エリアを設定
            const areaValue = profileData?.selected_area || profileData?.detail_area || null
            setUserSelectedArea(areaValue)
            console.log(`🗑️ [Home] onAuthStateChange: エリアを設定: ${areaValue || '(未設定)'}`)
            
            // 会員番号を設定
            if (profileData?.join_order) {
              setUserJoinOrder(profileData.join_order)
            }
            
            // 対応エリアチェック
            if (cityValue && !isSupportedCity(cityValue)) {
              setShowUnsupportedAreaModal(true)
            } else {
              setShowUnsupportedAreaModal(false)
            }
          }
          
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
        setUserCity(null)
        setUserSelectedArea(null)
        setUserJoinOrder(null)
        setShowUnsupportedAreaModal(false)
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

  // フォトコンテストイベントを取得
  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, prize_amount, end_date')
          .eq('status', 'active')
          .order('prize_amount', { ascending: false })
          .limit(1)
          .single()
        
        if (data && !error) {
          setActiveEvent(data)
        } else {
          // DBにイベントがない場合、デモ用のモックデータ
          setActiveEvent({
            id: 'demo-1',
            title: '彦根城 冬の絶景フォトコンテスト',
            prize_amount: 5000,
            end_date: '2026-02-28'
          })
        }
      } catch (err) {
        console.error('イベント取得エラー:', err)
        // エラー時もモックデータを表示
        setActiveEvent({
          id: 'demo-1',
          title: '彦根の冬景色フォトコンテスト',
          prize_amount: 5000,
          end_date: '2026-02-28'
        })
      }
    }
    fetchActiveEvent()
  }, [])

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
        .select('full_name, gender, birthday, location, city, interests')
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
      
      // birthday の厳密なチェック
      const hasBirthday = profile.birthday && 
                         profile.birthday !== '' && 
                         profile.birthday !== null && 
                         profile.birthday !== undefined
      
      // location の厳密なチェック（居住地：都道府県）
      const hasLocation = profile.location && 
                          profile.location !== '' && 
                          profile.location !== null && 
                          profile.location !== undefined
      
      // 詳細情報（生年月日、居住地のいずれか）が入力されているかチェック
      const hasDetails = hasBirthday || hasLocation
      
      console.log('hasFullName:', hasFullName, '| value:', profile.full_name)
      console.log('hasBirthday:', hasBirthday, '| value:', profile.birthday)
      console.log('hasLocation:', hasLocation, '| value:', profile.location)
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
        // ※ selected_area と detail_area の両方を確認（互換性のため）
        const areaValue = data.selected_area || data.detail_area || ''
        console.log('📝 [fetchProfileDataForEdit] プロフィール読み込み:', {
          location: data.location,
          city: data.city,
          selected_area: data.selected_area,
          detail_area: data.detail_area,
          使用するエリア: areaValue
        })
        setUsername(data.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー')
        setAvatarUrl(data.avatar_url || session.user.user_metadata?.avatar_url || '')
        setPrefecture(data.location || data.prefecture || '')
        setCity(data.city || '')
        setSelectedArea(areaValue)
        // ホーム画面のパーソナライズ用に登録都市とエリアを設定
        setUserCity(data.city || null)
        setUserSelectedArea(areaValue || null)
        console.log('🗑️ [fetchProfileDataForEdit] 判定に使用しているエリア名:', areaValue || 'なし')
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
        setSelectedArea('')
        setUserCity(null)
        setUserSelectedArea(null)
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

  // ルート検索関数（駅名ベースに修正）
  const handleSearchRoute = async () => {
    setIsSearching(true)
    try {
      // 座標ではなく駅名で送信（彦根→京都）
      const params = new URLSearchParams({
        from: '彦根',
        to: '京都',
      })
      
      const res = await fetch(`/api/transport/route?${params.toString()}`)
      const data = await res.json()
      
      // デバッグ: 取得したデータをコンソールに出力
      console.log("取得したデータ:", data)
      
      // status が OK 以外の場合はエラー内容を alert で表示
      if (data.status && data.status !== 'OK') {
        alert(`エラー: ${data.status}\n詳細: ${data.msg || data.error_message || data.detail || 'エラーが発生しました'}`)
      }
      
      if (res.ok && data.routes) {
        setRoutes(data.routes || [])
        console.log("取得したデータ:", data)
      } else {
        setRoutes([])
      }
    } catch (e) {
      console.error('経路検索エラー:', e)
      setRoutes([])
    } finally {
      setIsSearching(false)
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
        updateData.location = prefecture.trim() // locationカラムに都道府県を保存
      } else {
        updateData.location = null
      }

      if (city && city.trim()) {
        updateData.city = city.trim()
      } else {
        updateData.city = null
      }

      // 彦根市の場合はエリアを保存、それ以外はnull
      if (city === '彦根市' && selectedArea) {
        updateData.selected_area = selectedArea
      } else {
        updateData.selected_area = null
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
          location: prefecture || null,
          city: city.trim() || null,
          selected_area: city === '彦根市' ? selectedArea : null
        }))
        // ホーム画面のパーソナライズ用に更新
        const newCity = city.trim() || null
        setUserCity(newCity)
        console.log(`🏙️ [handleSaveProfile] 市区町村を更新: ${newCity || '(未設定)'}`)
        
        const newSelectedArea = city === '彦根市' ? selectedArea : null
        setUserSelectedArea(newSelectedArea)
        console.log(`🗑️ [handleSaveProfile] エリアを更新: ${newSelectedArea || '(未設定)'}`)
        
        // SWR キャッシュを更新（State変更後、SWRのキーも変わるので自動で再取得される）
        // 念のため手動でも再取得をトリガー
        refetchWaste()
        refetchStats()
        
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

  // ミッション写真選択
  const handleMissionPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB以下にしてください')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }
      setMissionPhoto(file)
      setMissionPhotoPreview(URL.createObjectURL(file))
    }
  }

  // ミッション完了
  const handleCompleteMission = async () => {
    if (!selectedMission || !missionPhoto || !currentUser) {
      alert('写真をアップロードしてください')
      return
    }
    
    setUploadingMission(true)
    
    // 実際のアップロード処理（デモでは省略してタイマーで完了させる）
    setTimeout(() => {
      setCompletedMissions(prev => [...prev, selectedMission.id])
      setMissionModalOpen(false)
      setSelectedMission(null)
      setMissionPhoto(null)
      setMissionPhotoPreview(null)
      setUploadingMission(false)
      alert('ミッションクリア！おめでとうございます！')
    }, 1500)
  }

  // ミッション達成数の計算
  const completedCount = completedMissions.length
  const remainingFor500Yen = Math.max(0, 5 - completedCount) // 5つで500円商品券
  const remainingForGrandPrize = Math.max(0, 10 - completedCount) // 10個で豪華景品応募

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
          
          {/* ポイントバッジ */}
          {currentUser && (
            <div 
              onClick={() => router.push('/profile')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 rounded-full cursor-pointer hover:from-amber-500 hover:to-yellow-600 transition-all shadow-sm active:scale-95"
            >
              <span className="text-sm">💰</span>
              <span className="text-xs font-black text-white">
                {pointsLoading ? '...' : userPoints.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-white/80">pt</span>
            </div>
          )}

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
          /* ホームコンテンツ - 新UI */
          <div className="max-w-xl mx-auto animate-in fade-in duration-500 space-y-4">
            
            {/* 0. 市民カウンター（町ごとの登録者数 / その町の人口） + 会員番号 */}
            {/* 表示する自治体名: userCity（ログインユーザーの居住地）を優先、なければ municipalityStats.municipalityName、最終フォールバックは「彦根市」 */}
            {(() => {
              const displayCityName = userCity || municipalityStats.municipalityName || '彦根市'
              console.log('🏙️ [Home UI] 表示する自治体名:', displayCityName, '(userCity:', userCity, ', stats:', municipalityStats.municipalityName, ')')
              return (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg">
                  {/* 上段：町ごとの登録者数 / その町の人口 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <UserCircle size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                          {/* 自治体名を表示（userCityを優先） */}
                          {displayCityName}の仲間
                        </p>
                        <p className="text-lg font-black text-white">
                          {statsLoading ? (
                            <span className="opacity-70 animate-pulse">読み込み中...</span>
                          ) : (
                            <>
                              {/* 町ごとの登録者数 / その町の人口 */}
                              <span className="text-yellow-300">
                                {municipalityStats.registeredUsers.toLocaleString()}
                              </span>
                              <span className="text-sm font-bold opacity-80">人</span>
                              <span className="mx-1 opacity-50">/</span>
                              {/* 人口が0の場合は「取得中」と表示、それ以外は人口を表示 */}
                              {municipalityStats.population > 0 ? (
                                <>
                                  <span>{municipalityStats.population.toLocaleString()}</span>
                                  <span className="text-sm font-bold opacity-80">人</span>
                                </>
                              ) : (
                                <span className="text-sm opacity-70">取得中...</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* 自治体名を常に表示（userCityを優先） */}
                      <p className="text-xs font-black text-white/90">
                        {displayCityName}
                      </p>
                      {/* 普及率：その町の登録人数 ÷ その町の人口 */}
                      {!statsLoading && municipalityStats.population > 0 && (
                        <p className="text-[10px] font-bold text-yellow-300">
                          {(() => {
                            const rate = (municipalityStats.registeredUsers / municipalityStats.population) * 100
                            return `普及率 ${rate.toFixed(3)}%`
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
              )
            })()}
              
                  {/* 下段：会員番号（ログインユーザーのみ表示） */}
                  {currentUser && userJoinOrder && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-center">
                        <span className="text-white/70 text-xs font-bold">あなたは</span>
                        <span className="text-yellow-300 text-xl font-black mx-2">
                          {userJoinOrder.toLocaleString()}
                        </span>
                        <span className="text-white/70 text-xs font-bold">人目の仲間です！</span>
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
            
            {/* 1. ゴミ収集情報カード（独立コンポーネント） */}
            <WasteScheduleCard
              userCity={userCity}
              userSelectedArea={userSelectedArea}
              userWasteSchedule={swrWasteSchedule}
              onSetupClick={() => setView('profile')}
            />

            {/* 2. フォトコンテストバナー */}
            {activeEvent && (
              <div 
                onClick={() => {
                  if (currentUser) {
                    router.push('/event')
                  } else {
                    router.push('/login')
                  }
                }}
                className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-[2rem] p-5 text-white shadow-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all group"
              >
                {/* 背景装飾 */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                  <Camera size={100} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
                </div>
                
                {/* コンテンツ */}
                <div className="relative z-10">
                  {/* 賞金バッジ */}
                  <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full font-black text-sm mb-3 shadow-lg animate-pulse">
                    <Trophy size={14} />
                    賞金 ¥{activeEvent.prize_amount.toLocaleString()}
                    <Sparkles size={12} />
                  </div>
                  
                  <h3 className="text-lg font-black mb-1 drop-shadow-sm">
                    今週のフォトコンテスト
                  </h3>
                  <p className="text-sm font-bold opacity-90 mb-3">
                    お題：{activeEvent.title.replace('フォトコンテスト', '').replace('ベストショット', '').trim() || '彦根の魅力'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-70">
                      〆切：{new Date(activeEvent.end_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}まで
                    </span>
                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full text-xs font-black group-hover:bg-white/30 transition-colors">
                      <Camera size={14} />
                      参加する
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. マンスリー・チャレンジセクション */}
            <div className="bg-white rounded-[2rem] p-5 shadow-lg border border-gray-100 overflow-hidden">
              {/* ヘッダー：豪華景品 */}
              <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 -mx-5 -mt-5 px-5 py-4 mb-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48L3N2Zz4=')] opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={20} className="text-white" />
                    <span className="text-xs font-black text-white/80 uppercase tracking-wider">1月のマンスリー・チャレンジ</span>
                  </div>
                  <h3 className="text-lg font-black text-white drop-shadow-sm leading-tight">
                    豪華景品：近江牛食べ比べセット
                  </h3>
                  <p className="text-sm font-bold text-white/90 mt-1">（抽選で1名様）</p>
                </div>
                <Star size={60} className="absolute -right-2 -top-2 text-white/20 rotate-12" />
              </div>

              {/* 達成ステータス */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-500">達成数</span>
                  <span className="text-sm font-black text-orange-500">{completedCount} / 10</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(completedCount / 10) * 100}%` }}
                  />
                </div>
                {remainingFor500Yen > 0 ? (
                  <p className="text-xs font-black text-orange-600 mt-2 flex items-center gap-1">
                    <Gift size={14} />
                    あと{remainingFor500Yen}つクリアで500円商品券ゲット！
                  </p>
                ) : remainingForGrandPrize > 0 ? (
                  <p className="text-xs font-black text-amber-600 mt-2 flex items-center gap-1">
                    <Trophy size={14} />
                    あと{remainingForGrandPrize}つで豪華景品の抽選に応募できます！
                  </p>
                ) : (
                  <p className="text-xs font-black text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle size={14} />
                    全ミッションクリア！豪華景品の抽選に参加中！
                  </p>
                )}
              </div>

              {/* ミッショングリッド（2x5） */}
              <div className="grid grid-cols-5 gap-2">
                {MONTHLY_MISSIONS.map((mission) => {
                  const MissionIcon = mission.icon
                  const isCompleted = completedMissions.includes(mission.id)
                  
                  return (
                    <button
                      key={mission.id}
                      onClick={() => {
                        setSelectedMission(mission)
                        setMissionModalOpen(true)
                      }}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition-all active:scale-95 ${
                        isCompleted 
                          ? 'bg-green-100 border-2 border-green-400' 
                          : 'bg-gray-50 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <MissionIcon 
                        size={20} 
                        className={isCompleted ? 'text-green-500' : 'text-gray-400'} 
                      />
                      <span className={`text-[8px] font-bold mt-0.5 text-center leading-tight ${
                        isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {mission.title.substring(0, 4)}...
                      </span>
                      
                      {/* 完了スタンプ */}
                      {isCompleted && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-green-500 rounded-full p-1 animate-bounce shadow-lg">
                            <CheckCircle size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* フッターリンク */}
              <button 
                onClick={() => {
                  if (!currentUser) {
                    router.push('/login')
                  }
                }}
                className="w-full mt-4 py-2 text-xs font-black text-orange-500 hover:text-orange-600 flex items-center justify-center gap-1"
              >
                <Target size={14} />
                {currentUser ? 'すべてのミッションを見る' : 'ログインしてチャレンジに参加'}
                <ChevronRight size={14} />
              </button>
            </div>

            {/* 4. 天気予報セクション */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-80 mb-1">{userCity || '彦根市'}の天気</p>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-black tracking-tighter">12°C</p>
                    <p className="text-lg font-bold mb-2 opacity-90">晴れ</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Droplets size={14} /> 20%</span>
                    <span className="flex items-center gap-1"><Wind size={14} /> 3m/s</span>
                  </div>
                </div>
                <Sun size={70} className="text-yellow-300 opacity-90" />
              </div>
              
              {/* 時系列天気（横スクロール） */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-[10px] font-black uppercase opacity-70 mb-3">12時間予報</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {HOURLY_WEATHER.map((hour, idx) => {
                    const WeatherIcon = hour.icon
                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[50px] bg-white/10 rounded-xl p-2">
                        <p className="text-[10px] font-bold opacity-80">{hour.time}</p>
                        <WeatherIcon size={20} className="my-1" />
                        <p className="text-sm font-black">{hour.temp}°</p>
                        {hour.precipitation > 0 && (
                          <p className="text-[9px] text-blue-200">{hour.precipitation}%</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 5. クーポン・バナーセクション */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Ticket size={16} className="text-orange-500" />
                  <h2 className="text-sm font-black text-gray-800">今日のクーポン</h2>
                </div>
                <button className="text-[10px] font-black text-orange-500">すべて見る</button>
              </div>
              
              {/* クーポン横スクロール */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {COUPONS.map((coupon) => (
                  <div 
                    key={coupon.id} 
                    className={`min-w-[200px] bg-gradient-to-br ${coupon.color} rounded-2xl p-4 text-white shadow-lg relative overflow-hidden`}
                  >
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                      <Gift size={60} />
                    </div>
                    <p className="text-[10px] font-bold opacity-80">{coupon.shop}</p>
                    <p className="text-xl font-black mb-1">{coupon.discount}</p>
                    <p className="text-[11px] font-bold opacity-90">{coupon.description}</p>
                    <p className="text-[9px] font-bold opacity-70 mt-2">{coupon.expires}</p>
                  </div>
                ))}
                {/* 広告枠プレースホルダー */}
                <div className="min-w-[200px] bg-gray-100 rounded-2xl p-4 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                  <Sparkles size={24} className="text-gray-300 mb-2" />
                  <p className="text-[10px] font-black text-gray-400 text-center">あなたのお店の<br/>クーポンを掲載しませんか？</p>
                </div>
              </div>
            </div>

            {/* 6. イベント情報リスト */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-purple-500" />
                  <h2 className="text-sm font-black text-gray-800">イベント情報</h2>
                </div>
                <button className="text-[10px] font-black text-purple-500">もっと見る</button>
              </div>
              
              <div className="space-y-3">
                {EVENTS.map((event) => {
                  const EventIcon = event.icon
                  return (
                    <div 
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                        <EventIcon size={18} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-800 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                          <span>{event.date}</span>
                          <span>•</span>
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${
                        event.category === 'お祭り' ? 'bg-orange-100 text-orange-600' :
                        event.category === 'イベント' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ひこにゃんAI バナー */}
            <div 
              onClick={() => setIsChatOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <img src={HIKONYAN_IMAGE} className="w-16 h-16 object-contain" alt="ひこにゃん" />
                <div>
                  <p className="font-black text-lg">困ったことがあったら</p>
                  <p className="text-sm font-bold opacity-90">ひこにゃんAIに聞いてニャ！</p>
                </div>
              </div>
              <Sparkles size={40} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
            </div>

            {/* 街を良くする目安箱（お問い合わせ）ボタン */}
            <div 
              onClick={() => router.push('/contact')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <MessageSquare size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg">街を良くする目安箱</p>
                  <p className="text-sm font-bold opacity-90">アプリや街への提案・ご意見をお寄せください</p>
                </div>
                <ChevronRight size={24} className="text-white/60" />
              </div>
            </div>
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
                            // 都道府県が変更されたら市区町村とエリアをリセット
                            setCity('')
                            setSelectedArea('')
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
                            onChange={(e) => {
                              setCity(e.target.value)
                              // 彦根市以外に変更された場合はエリアをリセット
                              if (e.target.value !== '彦根市') {
                                setSelectedArea('')
                              }
                            }}
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

                    {/* お住まいのエリア選択セクション */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">お住まいのエリア（彦根市限定）</span>
                      </label>
                      
                      {city === '彦根市' ? (
                        <>
                          <div className="relative">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                            <select
                              value={selectedArea}
                              onChange={(e) => setSelectedArea(e.target.value)}
                              className="w-full bg-blue-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            >
                              <option value="">エリアを選択してください</option>
                              {HIKONE_AREAS.map((area) => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[10px] text-gray-500 ml-2">
                            ※ エリアに合わせた情報（ゴミ収集日等）をお届けします
                          </p>
                          {selectedArea && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                              <p className="text-xs font-bold text-blue-700">
                                📍 選択中: {selectedArea.split('・')[0]}...
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                          <p className="text-xs text-gray-500 text-center">
                            {city ? (
                              <>現在「{city}」が選択されています。<br/>エリア選択は彦根市在住の方のみご利用いただけます。</>
                            ) : (
                              <>上で「滋賀県」→「彦根市」を選択すると、<br/>詳細なエリアを設定できます。</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

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
                        
                        {/* 居住地情報（新フォーマット対応）- prefecture または location を使用 */}
                        {(profile?.prefecture || profile?.location || profile?.city) && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-xs text-white/60 font-bold mb-2">居住地</p>
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-white/80" />
                              <p className="text-sm font-bold text-white">
                                {formatFullLocation(
                                  profile?.prefecture || profile?.location || null,
                                  profile?.region || null,
                                  profile?.city || null,
                                  profile?.selected_area || profile?.detail_area || null
                                )}
                              </p>
                            </div>
                          </div>
                        )}
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
          onComplete={async () => {
            // 保存成功後、モーダルを閉じてプロフィールを再チェック
            setShowProfileModal(false)
            
            // 最新のプロフィールデータを再取得（キャッシュクリア）
            console.log('📋 [Profile] モーダル閉じ後、最新データを再取得')
            
            // ===== プロフィールの最新データを取得してStateにセット =====
            if (currentUser?.id) {
              const { data: latestProfile, error: profileError } = await supabase
                .from('profiles')
                .select('city, selected_area, detail_area, join_order')
                .eq('id', currentUser.id)
                .single()
              
              if (!profileError && latestProfile) {
                console.log('📋 [Profile] 最新プロフィール:', latestProfile)
                
                // 市区町村を即座に更新
                const newCity = latestProfile.city || null
                setUserCity(newCity)
                console.log(`🏙️ [Profile] 市区町村を更新: ${newCity || '(未設定)'}`)
                
                // エリアを即座に更新
                const newArea = latestProfile.selected_area || latestProfile.detail_area || null
                setUserSelectedArea(newArea)
                console.log(`🗑️ [Profile] エリアを更新: ${newArea || '(未設定)'}`)
                
                // 会員番号を更新
                if (latestProfile.join_order) {
                  setUserJoinOrder(latestProfile.join_order)
                }
                
                // 対応エリアチェック
                if (newCity && !isSupportedCity(newCity)) {
                  setShowUnsupportedAreaModal(true)
                } else {
                  setShowUnsupportedAreaModal(false)
                }
              }
            }
            
            await fetchProfileData()
            
            // ホーム画面にいる場合のみ再チェック（これにより、次回はモーダルが表示されない）
            if (view === 'main') {
              checkProfileCompletion()
            }
            
            // SWRの再フェッチ（Stateが更新された後、SWRのキーも変わるので自動で再取得される）
            // 念のため手動でも再取得をトリガー
            refetchWaste()
            refetchStats()
          }}
        />
      )}

      {/* ミッション詳細モーダル */}
      {missionModalOpen && selectedMission && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setMissionModalOpen(false)
              setSelectedMission(null)
              setMissionPhoto(null)
              setMissionPhotoPreview(null)
            }}
          />
          
          {/* モーダル本体 */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[2001] bg-white rounded-[2rem] max-w-md mx-auto shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -right-2 -bottom-2">
                {(() => {
                  const MissionIcon = selectedMission.icon
                  return <MissionIcon size={60} className="text-white/20" />
                })()}
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} />
                  <span className="text-xs font-bold opacity-80">ミッション #{selectedMission.id}</span>
                </div>
                <h3 className="text-xl font-black">{selectedMission.title}</h3>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="p-5 space-y-5">
              {/* ミッション説明 */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-bold">{selectedMission.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {selectedMission.location}
                  </span>
                  <span className="flex items-center gap-1 text-amber-500 font-black">
                    <Star size={12} />
                    {selectedMission.points}pt
                  </span>
                </div>
              </div>

              {/* 完了済みの場合 */}
              {completedMissions.includes(selectedMission.id) ? (
                <div className="bg-green-50 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <CheckCircle size={32} className="text-white" />
                  </div>
                  <p className="font-black text-green-600 text-lg">クリア済み！</p>
                  <p className="text-sm text-green-500 font-bold mt-1">おめでとうございます</p>
                </div>
              ) : (
                /* 未完了の場合：写真アップロード */
                <>
                  {!currentUser ? (
                    /* 未ログイン */
                    <div className="bg-amber-50 rounded-2xl p-5 text-center">
                      <p className="text-sm font-bold text-amber-800 mb-3">
                        ミッションに参加するにはログインが必要です
                      </p>
                      <button
                        onClick={() => {
                          setMissionModalOpen(false)
                          router.push('/login')
                        }}
                        className="bg-amber-500 text-white px-6 py-2 rounded-full font-black text-sm"
                      >
                        ログインする
                      </button>
                    </div>
                  ) : (
                    /* ログイン済み：写真アップロード */
                    <div className="space-y-4">
                      <input
                        ref={missionFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleMissionPhotoSelect}
                        className="hidden"
                      />

                      {missionPhotoPreview ? (
                        <div className="relative">
                          <img 
                            src={missionPhotoPreview} 
                            alt="プレビュー" 
                            className="w-full h-40 object-cover rounded-2xl"
                          />
                          <button
                            onClick={() => {
                              setMissionPhoto(null)
                              setMissionPhotoPreview(null)
                            }}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => missionFileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-orange-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-orange-500 hover:bg-orange-50 transition-colors"
                        >
                          <Camera size={32} />
                          <span className="text-sm font-bold">写真をアップロード</span>
                          <span className="text-xs opacity-60">タップして選択または撮影</span>
                        </button>
                      )}

                      <button
                        onClick={handleCompleteMission}
                        disabled={!missionPhoto || uploadingMission}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg"
                      >
                        {uploadingMission ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                            確認中...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            ミッション完了を申請
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 閉じるボタン */}
            <div className="px-5 pb-5">
              <button
                onClick={() => {
                  setMissionModalOpen(false)
                  setSelectedMission(null)
                  setMissionPhoto(null)
                  setMissionPhotoPreview(null)
                }}
                className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}

      {/* エリア未対応モーダル（ログイン済みかつ対応エリア外の場合に表示） */}
      {showUnsupportedAreaModal && currentUser && (
        <>
          {/* Backdrop（クリックしても閉じない） */}
          <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-md" />
          
          {/* モーダル本体 */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[3001] bg-white rounded-[2rem] max-w-md mx-auto shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-black">サービス対象エリア外です</h3>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="p-6 space-y-5">
              {/* メッセージ */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                  {UNSUPPORTED_AREA_MESSAGE}
                </p>
              </div>
              
              {/* 現在の設定エリア */}
              {userCity && (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-500 font-bold mb-1">現在の設定エリア</p>
                  <p className="text-lg font-black text-gray-800">{userCity}</p>
                </div>
              )}
              
              {/* 対応エリア一覧 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-2">現在の対応エリア</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['彦根市', '多賀町', '甲良町', '豊郷町', '愛荘町'].map((area) => (
                    <span 
                      key={area}
                      className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-black"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* ひこにゃんメッセージ */}
              <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                <img 
                  src="https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png" 
                  className="w-16 h-16 object-contain" 
                  alt="ひこにゃん" 
                />
                <div>
                  <p className="text-sm font-black text-orange-700">
                    もう少し待っててニャ！
                  </p>
                  <p className="text-xs text-orange-600 font-bold mt-1">
                    あなたの街にも早く届けたいニャ〜
                  </p>
                </div>
              </div>
              
              {/* ボタン */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // プロフィール編集画面に遷移
                    setShowUnsupportedAreaModal(false)
                    setView('profile')
                  }}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  居住地を変更する
                </button>
                <button
                  onClick={async () => {
                    // ログアウト
                    if (confirm('ログアウトしますか？')) {
                      await supabase.auth.signOut()
                      setCurrentUser(null)
                      setProfile(null)
                      setShowUnsupportedAreaModal(false)
                      setView('main')
                    }
                  }}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- 下部ナビゲーション --- */}
      <BottomNavigation 
        onNavigate={() => {
          setIsChatOpen(false) // 他のページに遷移する時もチャットを閉じる
        }}
      />
    </div>
  )
}