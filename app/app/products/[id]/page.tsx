'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import TranslateButton from '@/components/TranslateButton'
import { getStoredNickname } from '@/lib/client-session'
import { logError } from '@/lib/client-logger'

interface Product {
  id: string
  name: string
  description: string | null
  images: string[]
  reserved: boolean
  prestec: boolean
  user: {
    nickname: string
  }
  createdAt: string
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [productId, setProductId] = useState<string | null>(null)
  const router = useRouter()
  const nickname = getStoredNickname()
  const { t } = useI18n()
  const { theme } = useTheme()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params
      setProductId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  const fetchProduct = async () => {
    if (!productId) return
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
      } else {
        router.push('/app')
      }
    } catch (error) {
      logError('Error carregant producte:', error)
      router.push('/app')
    } finally {
      setLoading(false)
    }
  }

  const toggleReserved = async () => {
    if (!product || product.user.nickname !== nickname) return

    try {
      const response = await fetch(`/api/products/${product.id}/reserve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserved: !product.reserved }),
      })
      if (response.ok) {
        const data = await response.json()
        setProduct({ ...product, reserved: data.reserved })
      }
    } catch (error) {
      logError('Error actualitzant reserva:', error)
    }
  }

  const togglePrestec = async () => {
    if (!product || product.user.nickname !== nickname) return

    try {
      const response = await fetch(`/api/products/${product.id}/loan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestec: !product.prestec }),
      })
      if (response.ok) {
        const data = await response.json()
        setProduct({ ...product, prestec: data.prestec })
      }
    } catch (error) {
      logError('Error actualitzant préstec:', error)
    }
  }

  const deleteProduct = async () => {
    if (!product || product.user.nickname !== nickname) return

    if (!confirm(t('products.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/app')
      }
    } catch (error) {
      logError('Error eliminant producte:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">{t('productDetail.loading')}</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">{t('productDetail.notFound')}</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Link
        href="/app"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 mb-4 inline-block text-sm sm:text-base"
      >
        {t('productDetail.backToProducts')}
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Galeria d'imatges */}
          <div className="w-full md:w-1/2">
            {product.images && product.images.length > 0 ? (
              <div className="relative">
                <div className="aspect-square bg-gray-200 dark:bg-gray-700">
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + product.images.length) % product.images.length
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) => (prev + 1) % product.images.length
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex
                              ? 'bg-white'
                              : 'bg-white bg-opacity-50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 dark:text-gray-500">{t('productDetail.noImage')}</span>
              </div>
            )}
          </div>

          {/* Informació del producte */}
          <div className="w-full md:w-1/2 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <TranslateButton text={product.name} />
              </h1>
              {product.reserved && (
                <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-semibold">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  {t('productDetail.reserved')}
                </div>
              )}
            </div>

            {product.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('productDetail.description')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  <TranslateButton text={product.description} />
                </p>
              </div>
            )}

            <div className="border-t dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('productDetail.publishedBy')}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.user.nickname}
                  </p>
                </div>
                {nickname && nickname === product.user.nickname ? (
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto justify-items-end sm:justify-items-start ml-auto pr-2">
                    <button
                      onClick={toggleReserved}
                      aria-label={product.reserved ? t('products.unreserved') : t('products.reserve')}
                      className={`group relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg font-medium transition flex items-center justify-center ${
                        product.reserved
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {product.reserved ? t('products.unreserved') : t('products.reserve')}
                      </span>
                      {product.reserved ? (
                        <>
                          <svg
                            className="w-10 h-10"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-10 h-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                    <button
                      onClick={togglePrestec}
                      aria-label={t('products.prestec')}
                      className={`group relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg font-medium transition flex items-center justify-center ${
                        product.prestec
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {t('products.prestec')}
                      </span>
                      <Image
                        src={product.prestec ? '/prestec_on.png' : (theme === 'dark' ? '/prestec_off_dark.png' : '/prestec_off.png')}
                        alt={product.prestec ? t('products.prestec') : ''}
                        width={40}
                        height={40}
                        className="w-10 h-10"
                      />
                    </button>
                    <Link
                      href={`/app/products/${product.id}/edit`}
                      aria-label={t('common.edit')}
                      className="group relative w-24 h-24 sm:w-28 sm:h-28 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center"
                    >
                      <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {t('common.edit')}
                      </span>
                      <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.9-9.9a1 1 0 000-1.414l-3.586-3.586a1 1 0 00-1.414 0l-9.9 9.9A1 1 0 004 15.414V20z"
                        />
                      </svg>
                    </Link>
                    <button
                      onClick={deleteProduct}
                      aria-label={t('productDetail.delete')}
                      className="group relative w-24 h-24 sm:w-28 sm:h-28 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center"
                    >
                      <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {t('productDetail.delete')}
                      </span>
                      <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  nickname && (
                    <Link
                      href={`/app/chat?nickname=${encodeURIComponent(product.user.nickname)}`}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm sm:text-base text-center block sm:inline-block"
                    >
                      {t('productDetail.contact')}
                    </Link>
                  )
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('productDetail.publishedOn')}{' '}
                {new Date(product.createdAt).toLocaleDateString('ca-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

