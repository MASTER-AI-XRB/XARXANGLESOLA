'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import TranslateButton from '@/components/TranslateButton'
import { getStoredNickname, getStoredViewMode, setStoredViewMode } from '@/lib/client-session'
import { logError } from '@/lib/client-logger'

interface Product {
  id: string
  name: string
  description: string | null
  images: string[]
  reserved: boolean
  reservedBy: { nickname: string } | null
  prestec: boolean
  user: { nickname: string }
  createdAt: string
  favoritesCount: number
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [refreshSpinning, setRefreshSpinning] = useState(false)
  const router = useRouter()
  const nickname = getStoredNickname()
  const { t } = useI18n()

  useEffect(() => {
    setViewMode(getStoredViewMode())
  }, [])

  useEffect(() => {
    if (!nickname) {
      router.push('/')
      return
    }
    fetchFavorites()
  }, [router, nickname])

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      logError('Error carregant preferits:', error)
    } finally {
      setLoading(false)
    }
  }

  const isReservedByOwner = (p: Product) =>
    !!p.reserved && p.reservedBy?.nickname === p.user.nickname
  /** Filet groc només per als productes dels meus que estan reservats per DM (jo sóc l’amo i jo ho he reservat). */
  const showOwnerReservedFillet = (p: Product) => !!p.reserved && p.reservedBy?.nickname === p.user.nickname
  const showDmFillet = (p: Product) =>
    !!nickname && !!p.reserved && p.reservedBy?.nickname === nickname && p.reservedBy?.nickname !== p.user.nickname
  const getFilletClass = (p: Product) =>
    p.prestec
      ? 'border-[6px] border-green-500'
      : showOwnerReservedFillet(p)
        ? 'border-[6px] border-blue-500'
        : showDmFillet(p)
          ? 'border-[6px] border-yellow-500'
          : ''
  const getFilletBoxShadow = (p: Product) =>
    p.prestec
      ? 'inset 0 0 0 6px #22c55e'
      : showOwnerReservedFillet(p)
        ? 'inset 0 0 0 6px #3b82f6'
        : showDmFillet(p)
          ? 'inset 0 0 0 6px #eab308'
          : ''
  const canUnreserve = (p: Product) =>
    !!p.reserved &&
    (nickname === (p.reservedBy?.nickname ?? '') ||
      (nickname === p.user.nickname && !p.reservedBy))

  const toggleReserved = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const product = products.find((p) => p.id === productId)
    if (!product || !canUnreserve(product)) return
    const nextReserved = !product.reserved
    try {
      const res = await fetch(`/api/products/${productId}/reserve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserved: nextReserved }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  reserved: nextReserved,
                  reservedBy: nextReserved && nickname ? { nickname } : null,
                }
              : p
          )
        )
        await fetchFavorites()
      }
    } catch (err) {
      logError('Error actualitzant reserva:', err)
    }
  }

  const removeFavorite = async (productId: string) => {
    try {
      await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      setProducts(products.filter((p) => p.id !== productId))
    } catch (error) {
      logError('Error eliminant preferit:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('favorites.title')}</h1>
        {/* Botó per canviar vista (visible a mòbil i desktop) */}
        <button
          onClick={() => {
            const next = viewMode === 'grid' ? 'list' : 'grid'
            setViewMode(next)
            setStoredViewMode(next)
          }}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={viewMode === 'grid' ? t('products.switchToListView') : t('products.switchToGridView')}
        >
          {viewMode === 'grid' ? (
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          )}
        </button>
        <button
          onClick={() => {
            setRefreshSpinning(true)
            fetchFavorites().finally(() => {
              setTimeout(() => setRefreshSpinning(false), 500)
            })
          }}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={t('products.refresh')}
          aria-label={t('products.refresh')}
        >
          <svg
            className={`w-6 h-6 text-gray-700 dark:text-gray-300 inline-block ${refreshSpinning ? 'animate-refresh-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('favorites.noFavorites')}</p>
          <Link
            href="/app"
            className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
          >
            {t('favorites.explore')}
          </Link>
        </div>
      ) : (
        <>
          {/* Vista grid compacta per mòbil i desktop */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
              {products.map((product) => (
                <Link
                key={product.id}
                href={`/app/products/${product.id}`}
                className={`relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group ${getFilletClass(product)}`}
              >
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">No image</span>
                  </div>
                )}
                {/* Overlay amb informació al hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs text-center px-2">
                    <p className="font-semibold line-clamp-2">{product.name}</p>
                  </div>
                </div>
                {/* Icones a la cantonada superior dreta */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {product.reserved &&
                    (canUnreserve(product) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleReserved(product.id, e)
                        }}
                        className={`rounded-full p-2 shadow-md transition ${
                          isReservedByOwner(product)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }`}
                        title={t('products.unreserveTitle')}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </button>
                    ) : (
                      <div
                        className={`rounded-full p-2 shadow-md ${
                          isReservedByOwner(product) ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-white'
                        }`}
                        title={t('products.reserved')}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </div>
                    ))}
                  {product.prestec && (
                    <div className="bg-green-500 text-white rounded-full p-2 shadow-md" title={t('products.prestec')}>
                      <Image
                        src="/prestec_on.png"
                        alt={t('products.prestec')}
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                      />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeFavorite(product.id)
                    }}
                    className="bg-red-500 hover:bg-red-600 rounded-full p-2 shadow-md transition"
                    aria-label={t('products.removeFromFavorites')}
                  >
                    <svg
                      className="w-5 h-5 text-white fill-current"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                </Link>
              ))}
            </div>
          )}
          {/* Vista detallada per desktop i mòbil (quan viewMode === 'list') */}
          <div className={`${viewMode === 'list' ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6`}>
            {products.map((product) => (
              <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-800 transition flex flex-col"
            >
              {product.images && product.images.length > 0 && (
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative flex-shrink-0">
                  <Link href={`/app/products/${product.id}`} className="relative block w-full h-full">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {getFilletBoxShadow(product) ? (
                      <span
                        className="absolute inset-0 pointer-events-none block"
                        style={{ boxShadow: getFilletBoxShadow(product) }}
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                  <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                    {product.reserved &&
                      (canUnreserve(product) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            toggleReserved(product.id, e)
                          }}
                          className={`rounded-full p-2 shadow-md transition ${
                            isReservedByOwner(product)
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                          }`}
                          title={t('products.unreserveTitle')}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        </button>
                      ) : (
                        <div
                          className={`rounded-full p-2 shadow-md text-white ${
isReservedByOwner(product) ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                        title={t('products.reserved')}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </div>
                    ))}
                    {product.prestec && (
                      <div className="bg-green-500 text-white rounded-full p-2 shadow-md" title={t('products.prestec')}>
                        <Image
                          src="/prestec_on.png"
                          alt={t('products.prestec')}
                          width={20}
                          height={20}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => removeFavorite(product.id)}
                      className="bg-red-500 hover:bg-red-600 rounded-full p-2 shadow-md transition"
                      aria-label={t('products.removeFromFavorites')}
                    >
                      <svg
                        className="w-5 h-5 text-white fill-current"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    <TranslateButton text={product.name} />
                  </h3>
                  {product.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      <TranslateButton text={product.description} />
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4 sm:mt-6">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {product.user.nickname}
                  </span>
                  <Link
                    href={`/app/products/${product.id}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                    title={t('products.seeMoreDetails')}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

