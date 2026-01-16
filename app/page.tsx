import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">彦根市ポータル</h1>
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">ようこそ</h2>
          <p className="text-gray-600">
            彦根市の最新情報をお届けします。食べ物、買い物、ニュース、交通情報など、地域の情報をまとめてご覧いただけます。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Link href="/taberu" className="bg-orange-500 text-white rounded-lg p-6 text-center shadow-md hover:bg-orange-600 transition">
            <div className="text-3xl mb-2">🍽️</div>
            <div className="font-semibold">たべる</div>
          </Link>
          
          <Link href="/kaimono" className="bg-green-500 text-white rounded-lg p-6 text-center shadow-md hover:bg-green-600 transition">
            <div className="text-3xl mb-2">🛒</div>
            <div className="font-semibold">買い物</div>
          </Link>

          {/* 新しく追加した「移動」ボタン */}
          <Link href="/ido" className="bg-blue-600 text-white rounded-lg p-6 text-center shadow-md hover:bg-blue-700 transition">
            <div className="text-3xl mb-2">🚆</div>
            <div className="font-semibold">移動</div>
          </Link>

          <Link href="/news" className="bg-yellow-500 text-white rounded-lg p-6 text-center shadow-md hover:bg-yellow-600 transition">
            <div className="text-3xl mb-2">📰</div>
            <div className="font-semibold">ニュース</div>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">お知らせ</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="border-b pb-2">• 電車時刻表ページを公開しました</li>
            <li className="border-b pb-2">• 新規店舗がオープンしました</li>
            <li className="border-b pb-2">• 地域イベントのご案内</li>
          </ul>
        </div>
      </div>
    </div>
  )
}