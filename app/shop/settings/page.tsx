'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Store, Save, Loader2, Camera, Trash2, Plus, X, Lock, CreditCard, Utensils, Image as ImageIcon, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { updateShopBasicInfo, updateShopImages, getMenuItems, upsertMenuItem, deleteMenuItem, getShopSettings, uploadShopImageAction } from '@/lib/actions/shop'
import Image from 'next/image'

// 画像圧縮用の簡易関数
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const maxWidth = 1200
        const scale = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scale
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        }, 'image/jpeg', 0.8)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ShopSettingsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const impersonateShopId = searchParams.get('impersonateShopId') || undefined
  
  // Data States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null)

  // Basic Info State
  const [address, setAddress] = useState('') // Read-only
  const [shopName, setShopName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [transactionPassword, setTransactionPassword] = useState('')
  
  // Bank Info State
  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    branchName: '',
    accountType: 'ordinary' as 'ordinary' | 'current',
    accountNumber: '',
    accountHolder: ''
  })

  // Photo State
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Menu State
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any | null>(null) // null means adding new or not editing

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      try {
        setLoading(true)
        const userId = user!.id

        // Use the centralized data fetching function that supports impersonation
        const { success, data, message } = await getShopSettings(userId, impersonateShopId)
        
        if (!success || !data) {
          console.error('Failed to fetch shop settings:', message)
          setMessage({ type: 'error', text: message || 'データ取得に失敗しました' })
          return
        }

        // 1. Set Shop Data
        if (data.shop) {
          setShopName(data.shop.name || '')
          setAddress(data.shop.address || '')
          setPhoneNumber(data.shop.phone_number || '')
          setThumbnailUrl(data.shop.thumbnail_url || null)
          setGalleryUrls(data.shop.gallery_urls || [])
        }

        // 2. Set Profile Data (Transaction Password)
        if (data.profile) {
          setTransactionPassword(data.profile.transaction_password || '')
        }

        // 3. Set Bank Data
        if (data.bank) {
          setBankInfo({
            bankName: data.bank.bank_name || '',
            branchName: data.bank.branch_name || '',
            accountType: (data.bank.account_type as any) || 'ordinary',
            accountNumber: data.bank.account_number || '',
            accountHolder: data.bank.account_holder || ''
          })
        }

        // 4. Fetch Menu Items (Separate call as it might return array)
        const { success: menuSuccess, data: menuData } = await getMenuItems(userId, impersonateShopId)
        if (menuSuccess && menuData) {
          setMenuItems(menuData)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        setMessage({ type: 'error', text: 'エラーが発生しました' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, impersonateShopId])

  // --- Handlers ---

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      // 銀行情報の入力チェック: 全て空の場合は undefined を渡して保存をスキップする
      const isBankInfoEmpty = !bankInfo.bankName && !bankInfo.branchName && !bankInfo.accountNumber && !bankInfo.accountHolder
      
      console.log('[Debug] handleSaveBasicInfo: Invoking updateShopBasicInfo (Shop ID resolution happens on server)', {
        userId: user.id,
        hasBankInfo: !isBankInfoEmpty
      })

      const result = await updateShopBasicInfo(user.id, {
        phoneNumber,
        transactionPassword,
        bankInfo: isBankInfoEmpty ? undefined : bankInfo
      }, impersonateShopId)
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || '保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'thumbnail' | 'gallery') => {
    if (!user) return
    setUploading(true)
    try {
      const compressedBlob = await compressImage(file)
      
      // Server Actionを使用してアップロード (Admin代理編集時のRLS回避のため)
      const formData = new FormData()
      formData.append('file', compressedBlob, file.name)
      
      const result = await uploadShopImageAction(formData, impersonateShopId)
      
      if (!result.success || !result.publicUrl) {
        throw new Error(result.message || 'アップロードに失敗しました')
      }

      const publicUrl = result.publicUrl

      if (type === 'thumbnail') {
        setThumbnailUrl(publicUrl)
        await updateShopImages(user.id, publicUrl, undefined, impersonateShopId)
      } else {
        const newGallery = [...galleryUrls, publicUrl]
        setGalleryUrls(newGallery)
        await updateShopImages(user.id, undefined, newGallery, impersonateShopId)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('アップロードに失敗しました: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeGalleryImage = async (index: number) => {
    if (!user) return
    const newGallery = [...galleryUrls]
    newGallery.splice(index, 1)
    setGalleryUrls(newGallery)
    await updateShopImages(user.id, undefined, newGallery, impersonateShopId)
  }

  // Menu Handlers
  const handleSaveMenuItem = async (item: any) => {
    if (!user) return
    
    const { success } = await upsertMenuItem(user.id, item, impersonateShopId)
    if (success) {
      // Refresh menu
      const { success: fetchSuccess, data } = await getMenuItems(user.id, impersonateShopId)
      if (fetchSuccess && data) setMenuItems(data)
      setEditingItem(null)
    } else {
      alert('保存に失敗しました')
    }
  }

  const handleDeleteMenuItem = async (id: string) => {
    if (!user || !confirm('本当に削除しますか？')) return
    
    const { success } = await deleteMenuItem(user.id, id, impersonateShopId)
    if (success) {
      const { success: fetchSuccess, data } = await getMenuItems(user.id, impersonateShopId)
      if (fetchSuccess && data) setMenuItems(data)
    } else {
      alert('削除に失敗しました')
    }
  }

  if (!user) {
    return <div className="p-8 text-center">ログインが必要です</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* ヘッダー */}
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-20">
        <Link href={impersonateShopId ? "/admin" : "/shop/dashboard"} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">店舗設定{impersonateShopId && ' (代理編集)'}</h1>
      </div>

      {impersonateShopId && (
        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-center gap-2 text-red-700 font-bold text-sm">
          <ShieldAlert size={18} />
          管理者として {shopName ? `[${shopName}]` : `(Shop ID: ${impersonateShopId})`} を編集中
        </div>
      )}

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        
        {/* --- 1. 写真管理 (優先) --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
            <ImageIcon className="text-pink-500" />
            写真設定
          </h2>
          
          <div className="space-y-6">
            {/* サムネイル */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">サムネイル画像 (一覧表示用)</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border">
                  {thumbnailUrl ? (
                    <Image src={thumbnailUrl} alt="Thumbnail" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Store size={32} />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                  {uploading ? <Loader2 className="animate-spin" /> : '画像を選択'}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'thumbnail')} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* ギャラリー */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ギャラリー画像 (詳細ページ用)</label>
              <div className="grid grid-cols-3 gap-2">
                {galleryUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border group">
                    <Image src={url} alt={`Gallery ${index}`} fill className="object-cover" />
                    <button 
                      onClick={() => removeGalleryImage(index)}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                  <Plus size={24} />
                  <span className="text-xs font-bold mt-1">追加</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach(file => handleImageUpload(file, 'gallery'))
                    }
                  }} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* --- 2. メニュー管理 (優先) --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <Utensils className="text-orange-500" />
              メニュー設定
            </h2>
            <button 
              onClick={() => setEditingItem({})} // Empty object for new item
              className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold hover:bg-orange-100"
            >
              + 追加
            </button>
          </div>

          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-sm text-gray-500">¥{item.price?.toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="p-2 text-gray-500 hover:bg-white rounded-lg"><Store size={16} /></button>
                  <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-red-500 hover:bg-white rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {menuItems.length === 0 && <p className="text-center text-gray-400 text-sm py-4">メニューが登録されていません</p>}
          </div>

          {/* Menu Edit Modal (Inline for simplicity) */}
          {editingItem && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">{editingItem.id ? 'メニュー編集' : 'メニュー追加'}</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  handleSaveMenuItem({
                    id: editingItem.id, // undefined for new
                    name: formData.get('name'),
                    price: Number(formData.get('price')),
                    description: formData.get('description'),
                    category: 'other', // Default or select
                    sort_order: 0
                  })
                }} className="space-y-4">
                  <input name="name" defaultValue={editingItem.name} placeholder="商品名" required className="w-full p-3 bg-gray-50 rounded-xl" />
                  <input name="price" type="number" defaultValue={editingItem.price} placeholder="価格" required className="w-full p-3 bg-gray-50 rounded-xl" />
                  <textarea name="description" defaultValue={editingItem.description} placeholder="説明" className="w-full p-3 bg-gray-50 rounded-xl" />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">キャンセル</button>
                    <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold">保存</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* --- 3. 基本情報 & 銀行口座 --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
           <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
             <Store className="text-blue-600" />
             基本・口座情報
           </h2>
           
           {loading ? (
             <div className="flex justify-center py-8">
               <Loader2 className="animate-spin text-gray-400" />
             </div>
           ) : (
             <form onSubmit={handleSaveBasicInfo} className="space-y-6">
               {/* Basic */}
               <div className="space-y-4 border-b pb-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">住所 (変更不可)</label>
                   <input type="text" value={address} readOnly className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500" />
                   <p className="text-xs text-red-500 mt-1">※住所変更は運営にお問い合わせください</p>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">電話番号</label>
                   <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="0749-xx-xxxx" />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                     <Lock size={14} /> 決済パスワード (4桁)
                   </label>
                   <input type="password" maxLength={4} value={transactionPassword} onChange={(e) => setTransactionPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg tracking-widest" placeholder="****" />
                 </div>
               </div>

               {/* Bank */}
               <div className="space-y-4">
                 <h3 className="font-bold text-gray-600 flex items-center gap-2">
                   <CreditCard size={18} /> 振込先口座
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                   <input value={bankInfo.bankName} onChange={(e) => setBankInfo({...bankInfo, bankName: e.target.value})} placeholder="銀行名" className="p-3 bg-gray-50 border rounded-xl" />
                   <input value={bankInfo.branchName} onChange={(e) => setBankInfo({...bankInfo, branchName: e.target.value})} placeholder="支店名" className="p-3 bg-gray-50 border rounded-xl" />
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                   <select value={bankInfo.accountType} onChange={(e) => setBankInfo({...bankInfo, accountType: e.target.value as any})} className="p-3 bg-gray-50 border rounded-xl">
                     <option value="ordinary">普通</option>
                     <option value="current">当座</option>
                   </select>
                   <input value={bankInfo.accountNumber} onChange={(e) => setBankInfo({...bankInfo, accountNumber: e.target.value})} placeholder="口座番号" className="col-span-2 p-3 bg-gray-50 border rounded-xl" />
                 </div>
                 <input value={bankInfo.accountHolder} onChange={(e) => setBankInfo({...bankInfo, accountHolder: e.target.value})} placeholder="口座名義 (カタカナ)" className="w-full p-3 bg-gray-50 border rounded-xl" />
               </div>

               {message && (
                 <div className={`p-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                   {message.text}
                 </div>
               )}

               <button
                 type="submit"
                 disabled={saving}
                 className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
               >
                 {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                 設定を保存する
               </button>
             </form>
           )}
        </section>

      </div>
    </div>
  )
}

export default function ShopSettingsMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    }>
      <ShopSettingsContent />
    </Suspense>
  )
}
