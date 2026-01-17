import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 pb-20"> {/* バーの高さ分、下に余白を空ける */}
        {/* メインコンテンツ */}
        <main>{children}</main>
        {/* ナビゲーションバーは各ページで管理 */}
      </body>
    </html>
  )
}