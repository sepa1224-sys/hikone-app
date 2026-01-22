import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 pb-20">
        {/* 認証プロバイダーでアプリ全体をラップ */}
        <AuthProvider>
          {/* メインコンテンツ */}
          {/* ボトムナビゲーションは各ページで個別に呼び出し（onNavigateプロパティ対応のため） */}
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}