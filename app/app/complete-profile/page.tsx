'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { setStoredSession } from '@/lib/client-session'

export default function CompleteProfilePage() {
  const { data: session, status } = useSession()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
      return
    }
    if (session.user?.nickname) {
      router.push('/app')
    }
  }, [session, status, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!nickname.trim()) {
      setError('El nickname és obligatori')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Error completant el perfil')
        return
      }
      if (data?.nickname) {
        setStoredSession(data.nickname, data.socketToken)
        router.push('/app')
        return
      }
      setError("No s'ha pogut completar el perfil")
    } catch {
      setError('Error de connexió')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-300">Carregant...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Completa el teu perfil
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Necessitem un nickname per poder entrar al xat.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nickname
            </label>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Introdueix un nickname"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Desant...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}
