'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { io, Socket } from 'socket.io-client'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { useNotifications } from '@/lib/notifications'
import TranslateButton from '@/components/TranslateButton'
import { getSocketUrl } from '@/lib/socket'

interface Product {
  id: string
  name: string
  description: string | null
  images: string[]
  reserved: boolean
  prestec: boolean
  userId: string
  user: {
    nickname: string
  }
  createdAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const { theme } = useTheme()
  const { showInfo } = useNotifications()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [filters, setFilters] = useState({
    name: '',
    user: '',
    dateFrom: '',
    dateTo: '',
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const router = useRouter()
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const nickname = typeof window !== 'undefined' ? localStorage.getItem('nickname') : null
  const { t } = useI18n()

  const refreshProducts = async () => {
    await fetchProducts()
  }

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, userId])

  // Connectar a Socket.IO per rebre notificacions
  useEffect(() => {
    if (!userId || !nickname) return

    const socketUrl = getSocketUrl()
    if (!socketUrl) return
    const newSocket = io(socketUrl, {
      query: { userId, nickname },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      console.log('Connectat a Socket.IO per notificacions')
    })

    // Escoltar notificacions de l'aplicació
    newSocket.on('app-notification', (data: { type: string; title: string; message: string; action?: { label: string; url?: string } }) => {
      showInfo(data.title, data.message, {
        type: data.type as 'info' | 'success' | 'warning' | 'error',
        action: data.action ? {
          label: data.action.label,
          onClick: () => {
            if (data.action?.url) {
              router.push(data.action.url)
            }
          }
        } : undefined,
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [userId, nickname, showInfo, router])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        setFilteredProducts(data)
        // Carregar estat de preferits després de carregar productes
        if (userId && data.length > 0) {
          fetchFavoritesStatus(data)
        }
      }
    } catch (error) {
      console.error('Error carregant productes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar productes
  useEffect(() => {
    let filtered = [...products]

    // Filtrar per nom
    if (filters.name) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(filters.name.toLowerCase())
      )
    }

    // Filtrar per usuari
    if (filters.user) {
      filtered = filtered.filter((product) =>
        product.user.nickname.toLowerCase().includes(filters.user.toLowerCase())
      )
    }

    // Filtrar per data
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom)
      filtered = filtered.filter((product) => {
        const productDate = new Date(product.createdAt)
        return productDate >= dateFrom
      })
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo)
      dateTo.setHours(23, 59, 59, 999) // Incloure tot el dia
      filtered = filtered.filter((product) => {
        const productDate = new Date(product.createdAt)
        return productDate <= dateTo
      })
    }

    setFilteredProducts(filtered)
  }, [filters, products])

  const fetchFavoritesStatus = async (productsList: Product[]) => {
    if (!userId || !productsList || productsList.length === 0) return
    try {
      const favoriteStatuses = await Promise.all(
        productsList.map(async (product) => {
          try {
            const response = await fetch(
              `/api/favorites/check?userId=${userId}&productId=${product.id}`
            )
            if (response.ok) {
              const data = await response.json()
              return { productId: product.id, isFavorite: data.isFavorite }
            }
            return { productId: product.id, isFavorite: false }
          } catch (err) {
            console.error(`Error comprovant preferit per producte ${product.id}:`, err)
            return { productId: product.id, isFavorite: false }
          }
        })
      )
      const favoritesSet = new Set(
        favoriteStatuses
          .filter((status) => status.isFavorite)
          .map((status) => status.productId)
      )
      console.log('Favorites set actualitzat:', Array.from(favoritesSet))
      setFavorites(favoritesSet)
    } catch (error) {
      console.error('Error carregant estat de preferits:', error)
    }
  }

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      console.error('No userId disponible')
      return
    }

    const isFavorite = favorites.has(productId)
    console.log(`Toggle favorite per producte ${productId}, actualment és favorit: ${isFavorite}`)

    try {
      let response
      if (isFavorite) {
        console.log(`Eliminant preferit: userId=${userId}, productId=${productId}`)
        response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, productId }),
        })
      } else {
        console.log(`Afegint preferit: userId=${userId}, productId=${productId}`)
        response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, productId }),
        })
      }

      const responseData = await response.json()
      console.log(`Resposta de l'API:`, responseData)

      if (response.ok) {
        console.log('Operació exitosa, refrescant estat...')
        // Refrescar estat de tots els preferits per assegurar que es manté
        if (products.length > 0) {
          await fetchFavoritesStatus(products)
        }
      } else {
        console.error(`Error ${isFavorite ? 'eliminant' : 'afegint'} preferit:`, responseData)
        alert(`Error: ${responseData.error || 'Error desconegut'}`)
      }
    } catch (error) {
      console.error('Error actualitzant preferit:', error)
      alert('Error de connexió. Torna-ho a intentar.')
    }
  }

  const toggleReserved = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return

    const product = products.find((p) => p.id === productId)
    if (!product || product.userId !== userId) return

    try {
      const response = await fetch(`/api/products/${productId}/reserve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reserved: !product.reserved }),
      })
      if (response.ok) {
        // Refrescar tots els productes per assegurar que l'estat es manté
        await fetchProducts()
      }
    } catch (error) {
      console.error('Error actualitzant reserva:', error)
    }
  }

  const togglePrestec = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return

    const product = products.find((p) => p.id === productId)
    if (!product || product.userId !== userId) return

    try {
      const response = await fetch(`/api/products/${productId}/loan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prestec: !product.prestec }),
      })
      if (response.ok) {
        // Refrescar tots els productes per assegurar que l'estat es manté
        await fetchProducts()
      }
    } catch (error) {
      console.error('Error actualitzant préstec:', error)
    }
  }

  const deleteProduct = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return

    if (!confirm(t('products.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
      }
    } catch (error) {
      console.error('Error eliminant producte:', error)
    }
  }


  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      name: '',
      user: '',
      dateFrom: '',
      dateTo: '',
    })
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h1>
        {/* Botó per canviar vista (visible a mòbil i desktop) */}
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
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
        </div>
        <Link
          href="/app/products/new"
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm sm:text-base"
        >
          {t('products.newProduct')}
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 mb-6">
        {/* Botó per obrir/tancar filtres a mòbil */}
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="md:hidden w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b dark:border-gray-700"
        >
          <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t('products.filters.title')}
            {(filters.name || filters.user || filters.dateFrom || filters.dateTo) && (
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                {[filters.name, filters.user, filters.dateFrom, filters.dateTo].filter(Boolean).length}
              </span>
            )}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Contingut dels filtres */}
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:block p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="min-w-0">
            <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('products.filters.name')}
            </label>
            <input
              type="text"
              id="filter-name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              placeholder={t('products.filters.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="filter-user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('products.filters.user')}
            </label>
            <input
              type="text"
              id="filter-user"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder={t('products.filters.userPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="filter-date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('products.filters.dateFrom')}
            </label>
            <div className="flex">
              <input
                type="date"
                id="filter-date-from"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ minWidth: 0 }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filter-date-to" className="block text-sm font-medium text-gray-700 mb-1">
              {t('products.filters.dateTo')}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                id="filter-date-to"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-full"
              />
              {(filters.name || filters.user || filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  title={t('products.filters.clearFilters')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          </div>
          {(filters.name || filters.user || filters.dateFrom || filters.dateTo) && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {t('products.showing', { filtered: filteredProducts.length, total: products.length })}
            </div>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('products.noProductsPublished')}</p>
          <Link
            href="/app/products/new"
            className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
          >
            {t('products.beFirst')}
          </Link>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('products.noResults')}</p>
          <button
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
          >
            {t('products.filters.clearFilters')}
          </button>
        </div>
      ) : (
        <>
          {/* Vista grid compacta per mòbil i desktop */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/app/products/${product.id}`}
                className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group"
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
                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  {product.reserved && (
                    <div className="bg-yellow-500 text-white rounded-full p-2 shadow-md" title={t('products.reserved')}>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </div>
                  )}
                  {product.prestec && (
                    <div className="bg-green-500 text-white rounded-full p-2 shadow-md" title={t('products.prestec')}>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="xMidYMid meet"
                      >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16.5V19a2 2 0 002 2h6a2 2 0 002-2v-2.5M7 16.5a2.5 2.5 0 01-2-1M7 16.5c0-.552.196-1.06.518-1.46L9.5 13.5M17 16.5a2.5 2.5 0 002-1M17 16.5c0-.552-.196-1.06-.518-1.46L14.5 13.5M7 16.5h10M9 11a3 3 0 106 0m-6 0a3 3 0 116 0m-6 0v-1a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6"
                          />
                      </svg>
                    </div>
                  )}
                  {product.userId === userId ? (
                    <>
                      {!product.reserved && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleReserved(product.id, e)
                          }}
                          className="bg-white dark:bg-white rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-100 transition"
                          title={t('products.reserveTitle')}
                        >
                          <svg
                            className="w-5 h-5 text-gray-600 dark:text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          togglePrestec(product.id, e)
                        }}
                        className={`rounded-full p-2 shadow-md transition ${
                          product.prestec
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-100 dark:bg-white hover:bg-gray-200 dark:hover:bg-gray-100'
                        }`}
                        title={product.prestec ? t('products.unprestecTitle') : t('products.prestecTitle')}
                      >
                        <Image
                          src={product.prestec ? '/prestec_on.png' : '/prestec_off.png'}
                          alt={product.prestec ? t('products.prestec') : ''}
                          width={20}
                          height={20}
                          className="w-5 h-5 object-contain"
                        />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(product.id, e)
                      }}
                      className={`rounded-full p-2 shadow-md transition ${
                        favorites.has(product.id)
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-white dark:bg-white hover:bg-gray-100 dark:hover:bg-gray-100'
                      }`}
                      title={favorites.has(product.id) ? t('products.removeFromFavorites') : t('products.addToFavorites')}
                    >
                      <svg
                        className={`w-5 h-5 ${
                          favorites.has(product.id)
                            ? 'text-white'
                            : 'text-gray-400 dark:text-gray-500 hover:text-red-500'
                        }`}
                        fill={favorites.has(product.id) ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </Link>
            ))}
            </div>
          )}
          {/* Vista detallada per desktop i mòbil (quan viewMode === 'list') */}
          <div className={`${viewMode === 'list' ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6`}>
            {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-800 transition flex flex-col"
            >
              {product.images && product.images.length > 0 && (
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative group flex-shrink-0">
                  <Link href={`/app/products/${product.id}`}>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {/* Si ets propietari */}
                    {product.userId === userId ? (
                      <>
                        {/* Icona per reservar/desreservar (bookmark) */}
                        <button
                          onClick={(e) => toggleReserved(product.id, e)}
                          className={`rounded-full p-2 shadow-md hover:bg-gray-100 transition ${
                            product.reserved
                              ? 'bg-yellow-500 text-white'
                              : 'bg-white text-gray-600'
                          }`}
                          title={product.reserved ? t('products.unreserveTitle') : t('products.reserveTitle')}
                        >
                          {product.reserved ? (
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                          ) : (
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
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                            </svg>
                          )}
                        </button>
                        {/* Icona per préstec */}
                        <button
                          onClick={(e) => togglePrestec(product.id, e)}
                          className={`rounded-full p-2 shadow-md transition ${
                            product.prestec
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-gray-100 dark:bg-white hover:bg-gray-200 dark:hover:bg-gray-100'
                          }`}
                          title={product.prestec ? t('products.unprestecTitle') : t('products.prestecTitle')}
                        >
                          <Image
                            src={product.prestec ? '/prestec_on.png' : '/prestec_off.png'}
                            alt={product.prestec ? t('products.prestec') : ''}
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                        </button>
                        {/* Icona per eliminar */}
                        <button
                          onClick={(e) => deleteProduct(product.id, e)}
                          className="bg-white rounded-full p-2 shadow-md hover:bg-red-100 transition"
                          title={t('products.deleteProduct')}
                        >
                          <svg
                            className="w-5 h-5 text-red-600"
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
                      </>
                    ) : (
                      /* Si no ets propietari, només mostra el cor per preferits */
                      <button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className={`rounded-full p-2 shadow-md transition ${
                          favorites.has(product.id)
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                        aria-label={favorites.has(product.id) ? t('products.removeFromFavorites') : t('products.addToFavorites')}
                        title={favorites.has(product.id) ? t('products.removeFromFavorites') : t('products.addToFavorites')}
                      >
                        {favorites.has(product.id) ? (
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
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-400 hover:text-red-500 transition"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        )}
                      </button>
                    )}
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

