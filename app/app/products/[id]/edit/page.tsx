'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { getStoredNickname } from '@/lib/client-session'

interface Product {
  id: string
  name: string
  description: string | null
  images: string[]
  user: {
    nickname: string
  }
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const [productId, setProductId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params
      setProductId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!productId) return

    const nickname = getStoredNickname()
    if (!nickname) {
      router.push('/')
      return
    }

    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) {
          router.push('/app')
          return
        }
        const data = (await response.json()) as Product
        if (data.user?.nickname !== nickname) {
          router.push('/app')
          return
        }
        setName(data.name)
        setDescription(data.description || '')
        setExistingImages(Array.isArray(data.images) ? data.images : [])
      } catch (err) {
        router.push('/app')
      }
    }

    fetchProduct()
  }, [productId, router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)
    const remaining = 4 - (existingImages.length + newImages.length)
    const accepted = files.slice(0, Math.max(0, remaining))

    if (accepted.length < files.length) {
      setError(t('newProduct.maxImages'))
    }

    setNewImages((prev) => [...prev, ...accepted])

    accepted.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index))
    setNewPreviews(newPreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim()) {
      setError(t('newProduct.nameRequired'))
      setLoading(false)
      return
    }

    const totalImages = existingImages.length + newImages.length
    if (totalImages === 0) {
      setError(t('newProduct.addImage'))
      setLoading(false)
      return
    }

    if (totalImages > 4) {
      setError(t('newProduct.maxImages'))
      setLoading(false)
      return
    }

    if (!productId) {
      setError(t('newProduct.userNotAuth'))
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('existingImages', JSON.stringify(existingImages))
      newImages.forEach((image) => {
        formData.append('images', image)
      })

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await response.json()
      if (response.ok) {
        router.push(`/app/products/${productId}`)
      } else {
        setError(data.error || t('newProduct.createError'))
      }
    } catch (err) {
      setError(t('newProduct.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
        {t('common.edit')} {t('newProduct.title')}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-gray-900">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('newProduct.name')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('newProduct.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('newProduct.images')}
            </label>
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {(existingImages.length > 0 || newPreviews.length > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {existingImages.map((image, index) => (
                  <div key={`existing-${index}`} className="relative">
                    <img
                      src={image}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? t('newProduct.publishing') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm sm:text-base"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
