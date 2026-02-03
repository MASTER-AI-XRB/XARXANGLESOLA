'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
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
}

export default function MyProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [refreshSpinning, setRefreshSpinning] = useState(false)
  const router = useRouter()
  const nickname = getStoredNickname()
  const { t } = useI18n()
  const { theme } = useTheme()

  useEffect(() => {
    setViewMode(getStoredViewMode())
  }, [])

  useEffect(() => {
    if (!nickname) {
      router.push('/')
      return
    }
    fetchMyProducts()
  }, [router, nickname])

  const fetchMyProducts = async () => {
    try {
      const response = await fetch('/api/products/my', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      logError('Error carregant els meus productes:', error)
    } finally {
      setLoading(false)
    }
  }

  const canReserve = (p: Product) =>
    nickname === p.user.nickname && !p.reserved
  const canUnreserve = (p: Product) =>
    p.reserved &&
    (nickname === (p.reservedBy?.nickname ?? '') ||
      (nickname === p.user.nickname && !p.reservedBy))
  const isReservedByOwner = (p: Product) =>
    !!p.reserved && p.reservedBy?.nickname === p.user.nickname
  /** Filet blau: reserva del propietari. Filet groc: reserva via DM (altra persona). */
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

  const toggleReserved = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const product = products.find((p) => p.id === productId)
    if (!product || (!canReserve(product) && !canUnreserve(product))) return
    const nextReserved = !product.reserved

    try {
      const response = await fetch(`/api/products/${productId}/reserve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserved: nextReserved }),
      })
      if (response.ok) {
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
        fetchMyProducts()
      }
    } catch (error) {
      logError('Error actualitzant reserva:', error)
    }
  }

  const togglePrestec = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const product = products.find((p) => p.id === productId)
    if (!product) return

    try {
      const response = await fetch(`/api/products/${productId}/loan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestec: !product.prestec }),
      })
      if (response.ok) {
        await fetchMyProducts()
      }
    } catch (error) {
      logError('Error actualitzant préstec:', error)
    }
  }

  const deleteProduct = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(t('products.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchMyProducts()
      }
    } catch (error) {
      logError('Error eliminant producte:', error)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('myProducts.title')}</h1>
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
              fetchMyProducts().finally(() => {
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
        <Link
          href="/app/products/new"
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm sm:text-base"
        >
          {t('products.newProduct')}
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('myProducts.noProducts')}</p>
          <Link
            href="/app/products/new"
            className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
          >
            {t('myProducts.publishFirst')}
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
                {/* Botons de reservat, préstec i eliminar */}
                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  {canUnreserve(product) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleReserved(product.id, e)
                      }}
                      className={`rounded-full p-2 shadow-md transition ${
                        product.reserved
                          ? isReservedByOwner(product)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={product.reserved ? t('products.unreserveTitle') : t('products.reserved')}
                    >
                      {product.reserved ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" preserveAspectRatio="xMidYMid meet">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      )}
                    </button>
                  ) : nickname === product.user.nickname && canReserve(product) ? null : (
                    <div
                      className={`rounded-full p-2 shadow-md ${
                        product.reserved
                          ? isReservedByOwner(product)
                            ? 'bg-blue-500 text-white'
                            : 'bg-yellow-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                      title={product.reserved ? t('products.reserved') : t('products.notReserved')}
                    >
                      {product.reserved ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" preserveAspectRatio="xMidYMid meet">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      )}
                    </div>
                  )}
                  {canReserve(product) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleReserved(product.id, e)
                      }}
                      className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title={t('products.reserveTitle')}
                    >
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  )}
                  {/* Botó per préstec */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      togglePrestec(product.id, e)
                    }}
                    className={`rounded-full p-2 shadow-md transition ${
                      product.prestec
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={product.prestec ? t('products.unprestecTitle') : t('products.prestecTitle')}
                  >
                    <Image
                      src={product.prestec ? '/prestec_on.png' : (theme === 'dark' ? '/prestec_off_dark.png' : '/prestec_off.png')}
                      alt={product.prestec ? t('products.prestec') : ''}
                      width={20}
                      height={20}
                      className="w-5 h-5 object-contain"
                    />
                  </button>
                  {/* Botó per eliminar */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteProduct(product.id, e)
                    }}
                    className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                    title={t('products.deleteProduct')}
                  >
                    <svg
                      className="w-5 h-5 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                </Link>
              ))}
            </div>
          )}
          {/* Vista detallada per desktop i mòbil (quan viewMode === 'list') */}
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
                    {canUnreserve(product) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleReserved(product.id, e)
                        }}
                        className={`rounded-full p-2 shadow-md transition ${
                          product.reserved
                            ? isReservedByOwner(product)
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={product.reserved ? t('products.unreserveTitle') : t('products.reserved')}
                      >
                        {product.reserved ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                      </button>
                    ) : nickname === product.user.nickname && canReserve(product) ? null : (
                      <div
                        className={`rounded-full p-2 shadow-md ${
                          product.reserved
                            ? isReservedByOwner(product)
                              ? 'bg-blue-500 text-white'
                              : 'bg-yellow-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                        title={product.reserved ? t('products.reserved') : t('products.notReserved')}
                      >
                        {product.reserved ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                      </div>
                    )}
                    {canReserve(product) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleReserved(product.id, e)
                        }}
                        className="rounded-full p-2 shadow-md transition bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={t('products.reserveTitle')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    )}
                    {/* Botó per préstec */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        togglePrestec(product.id, e)
                      }}
                      className={`rounded-full p-2 shadow-md transition ${
                        product.prestec
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={product.prestec ? t('products.unprestecTitle') : t('products.prestecTitle')}
                    >
                      <Image
                        src={product.prestec ? '/prestec_on.png' : (theme === 'dark' ? '/prestec_off_dark.png' : '/prestec_off.png')}
                        alt={product.prestec ? t('products.prestec') : ''}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </button>
                    {/* Botó per eliminar */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteProduct(product.id, e)
                      }}
                      className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                      title={t('products.deleteProduct')}
                    >
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
                    {t('products.publishedOn')}{' '}
                    {new Date(product.createdAt).toLocaleDateString('ca-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
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

