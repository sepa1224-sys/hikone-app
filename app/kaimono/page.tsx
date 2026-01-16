export default function Kaimono() {
  const shops = [
    { id: 1, name: 'スーパーマーケットX', category: 'スーパー', distance: '500m' },
    { id: 2, name: 'コンビニY', category: 'コンビニ', distance: '200m' },
    { id: 3, name: 'ドラッグストアZ', category: 'ドラッグ', distance: '800m' },
    { id: 4, name: '書店W', category: '書店', distance: '1.2km' },
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">買い物</h1>
      
      <div className="space-y-4">
        {shops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold text-gray-800">{shop.name}</h2>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                {shop.category}
              </span>
            </div>
            <div className="flex items-center text-gray-600 mb-3">
              <span className="text-sm">📍</span>
              <span className="ml-1 text-sm">距離: {shop.distance}</span>
            </div>
            <p className="text-gray-600 text-sm">
              日用品から食品まで、幅広い商品を取り揃えています。
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
