'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { useI18n } from '@/lib/i18n'
import { getStoredNickname, setStoredSession } from '@/lib/client-session'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [backgroundSize, setBackgroundSize] = useState('80%')
  const [scrollY, setScrollY] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 })
  const [logoRotation, setLogoRotation] = useState(0)
  const [logoScale, setLogoScale] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'expanding' | 'complete'>('idle')
  const router = useRouter()
  const sessionHook = useSession()
  const { data: session, status } = sessionHook ?? { data: null, status: 'loading' as const }
  const { t } = useI18n()

  useEffect(() => {
    // Comprovar si ja hi ha un usuari loguejat
    const savedNickname = getStoredNickname()
    if (savedNickname) {
      router.push('/app')
      return
    }
    if (status === 'loading') return
    if (!session) return
    if (session?.needsNickname) {
      router.push('/app/complete-profile')
      return
    }
    fetch('/api/auth/socket-token')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          return
        }
        if (data?.needsNickname) {
          router.push('/app/complete-profile')
          return
        }
        if (data?.nickname) {
          setStoredSession(data.nickname, data.socketToken)
          router.push('/app')
        }
      })
      .catch(() => null)
  }, [router, session, status])

  useEffect(() => {
    // Ajustar la mida del logo segons la mida de la pantalla
    const updateBackgroundSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        // Mòbil: logo més gran per millor visibilitat
        setBackgroundSize('90%')
      } else {
        // Desktop: logo més petit
        setBackgroundSize('60%')
      }
    }

    updateBackgroundSize()
    window.addEventListener('resize', updateBackgroundSize)
    return () => window.removeEventListener('resize', updateBackgroundSize)
  }, [])

  useEffect(() => {
    // Efecte parallax: el logo es mou en direcció oposada al scroll
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      setScrollY(window.scrollY)
      setIsScrolling(true)
      
      // Després de 1 segon sense scroll, activar l'animació automàtica
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 1000)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  useEffect(() => {
    // Moviment lineal aleatori del logo: vagant per l'espai amb acceleracions suaus i rotació
    if (isScrolling) {
      setLogoPosition({ x: 0, y: 0 })
      return
    }

    let animationFrameId: number
    let currentX = 0
    let currentY = 0
    let currentRotation = 0
    let velocityX = 0
    let velocityY = 0
    let targetVelocityX = 0
    let targetVelocityY = 0
    let lastDirectionChange = Date.now()
    
    // AJUSTOS DEL MOVIMENT:
    const baseSpeed = 2 // Velocitat base (píxels per frame). Valors més alts = més ràpid
    const accelerationRate = 0.03 // Taxa d'acceleració suau. Valors més alts = acceleració més ràpida
    const directionChangeInterval = 2000 + Math.random() * 3000 // Temps entre canvis de direcció (2-5 segons)
    const maxPosition = 80 // Límit màxim de desplaçament des del centre (píxels). Valors més baixos = àrea de moviment més petita
    const rotationSpeed = 0.05 // Velocitat de rotació (graus per frame). Valors més alts = rotació més ràpida
    const maxAngleChange = 120 // Angle màxim de canvi de direcció (graus). Valors més baixos = canvis més suaus
    
    const getCurrentAngle = () => {
      // Calcular l'angle actual del moviment basat en la velocitat
      if (velocityX === 0 && velocityY === 0) return null
      return Math.atan2(velocityY, velocityX)
    }
    
    const generateNewDirection = (currentAngle: number | null) => {
      // Generar una nova direcció respectant l'angle actual amb una desviació màxima
      let angle: number
      
      if (currentAngle !== null) {
        // Convertir l'angle actual a graus
        const currentAngleDegrees = currentAngle * (180 / Math.PI)
        // Generar un canvi d'angle aleatori dins del rang de ±120 graus
        const angleChange = (Math.random() - 0.5) * 2 * maxAngleChange // -120 a +120 graus
        // Nou angle respectant la direcció actual
        const newAngleDegrees = currentAngleDegrees + angleChange
        // Convertir de nou a radians
        angle = newAngleDegrees * (Math.PI / 180)
      } else {
        // Si no hi ha direcció actual, generar una direcció completament aleatòria
        angle = Math.random() * Math.PI * 2
      }
      
      const speed = baseSpeed * (0.7 + Math.random() * 0.6) // Velocitat amb més variació
      return {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
    }

    const animate = () => {
      const now = Date.now()
      
      // Rotació continua i lenta sobre si mateix
      currentRotation += rotationSpeed
      if (currentRotation >= 360) currentRotation -= 360
      setLogoRotation(currentRotation)
      
      // Canviar direcció de manera aleatòria cada cert temps (més freqüent)
      if (now - lastDirectionChange > directionChangeInterval) {
        const currentAngle = getCurrentAngle()
        const newDir = generateNewDirection(currentAngle)
        targetVelocityX = newDir.x
        targetVelocityY = newDir.y
        lastDirectionChange = now
        // Regenerar interval per següent canvi
      }
      
      // Acceleració suau cap a la velocitat objectiu (com si tingués vida pròpia)
      velocityX += (targetVelocityX - velocityX) * accelerationRate
      velocityY += (targetVelocityY - velocityY) * accelerationRate
      
      // Aplicar la velocitat a la posició
      currentX += velocityX
      currentY += velocityY
      
      // Mantenir el logo dins d'uns límits (rebot suau amb canvi de direcció)
      if (Math.abs(currentX) > maxPosition) {
        velocityX *= -0.6 // Rebot suau
        currentX = Math.sign(currentX) * maxPosition
        // Generar nova direcció després del rebot respectant la direcció actual
        const currentAngle = getCurrentAngle()
        const newDir = generateNewDirection(currentAngle)
        targetVelocityX = newDir.x
        targetVelocityY = newDir.y
        lastDirectionChange = now
      }
      
      if (Math.abs(currentY) > maxPosition) {
        velocityY *= -0.6 // Rebot suau
        currentY = Math.sign(currentY) * maxPosition
        // Generar nova direcció després del rebot respectant la direcció actual
        const currentAngle = getCurrentAngle()
        const newDir = generateNewDirection(currentAngle)
        targetVelocityX = newDir.x
        targetVelocityY = newDir.y
        lastDirectionChange = now
      }
      
      setLogoPosition({ x: currentX, y: currentY })
      animationFrameId = requestAnimationFrame(animate)
    }
    
    // Iniciar amb una direcció inicial (sense direcció previa)
    const initialDir = generateNewDirection(null)
    targetVelocityX = initialDir.x
    targetVelocityY = initialDir.y
    velocityX = initialDir.x
    velocityY = initialDir.y
    
    // Iniciar l'animació
    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [isScrolling])

  useEffect(() => {
    // Canvis aleatoris de mida del logo (mòbil i desktop)
    if (isScrolling) {
      setLogoScale(1)
      return
    }

    let animationFrameId: number
    let timeoutId: NodeJS.Timeout
    let currentScale = 1
    let isScaling = false
    let startTime = 0
    
    // AJUSTOS DE CANVIS DE MIDA:
    const scaleUpDuration = 1500 // Durada per augmentar la mida (en mil·lisegons)
    const scaleDownDuration = 1500 // Durada per reduir la mida (en mil·lisegons)
    const holdDuration = 2000 // Temps que es manté la mida augmentada (en mil·lisegons)
    const minScale = 1.1 // Mida mínima augmentada (10% més gran)
    const maxScale = 2.5 // Mida màxima augmentada (30% més gran)
    const minDelay = 3000 // Temps mínim entre canvis de mida (en mil·lisegons)
    const maxDelay = 6000 // Temps màxim entre canvis de mida (en mil·lisegons)

    const startScaleChange = () => {
      const targetScale = minScale + Math.random() * (maxScale - minScale)
      const startScale = currentScale
      isScaling = true
      startTime = Date.now()
      
      const animate = () => {
        if (!isScaling) return
        
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / scaleUpDuration, 1)
        
        // Funció d'acceleració suau
        const easeOut = 1 - Math.pow(1 - progress, 2)
        
        currentScale = startScale + (targetScale - startScale) * easeOut
        setLogoScale(currentScale)
        
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate)
        } else {
          // Mantenir la mida augmentada
          currentScale = targetScale
          setLogoScale(currentScale)
          
          timeoutId = setTimeout(() => {
            // Començar a reduir la mida
            const returnStartTime = Date.now()
            const returnStartScale = currentScale
            
            const returnAnimate = () => {
              const returnElapsed = Date.now() - returnStartTime
              const returnProgress = Math.min(returnElapsed / scaleDownDuration, 1)
              
              // Funció d'acceleració suau per tornar
              const easeIn = returnProgress * returnProgress
              
              currentScale = returnStartScale + (1 - returnStartScale) * easeIn
              setLogoScale(currentScale)
              
              if (returnProgress < 1) {
                animationFrameId = requestAnimationFrame(returnAnimate)
              } else {
                isScaling = false
                currentScale = 1
                setLogoScale(1)
                
                // Esperar un temps aleatori abans del següent canvi de mida
                const nextScaleDelay = minDelay + Math.random() * (maxDelay - minDelay)
                timeoutId = setTimeout(() => {
                  startScaleChange()
                }, nextScaleDelay)
              }
            }
            
            animationFrameId = requestAnimationFrame(returnAnimate)
          }, holdDuration)
        }
      }
      
      animate()
    }

    // Iniciar el primer canvi de mida després d'un delay
    timeoutId = setTimeout(() => {
      startScaleChange()
    }, 3000)

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isMobile, isScrolling])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) {
      setError(t('auth.nicknameRequired'))
      return
    }

    if (nickname.length < 3) {
      setError(t('auth.nicknameMinLength'))
      return
    }

    if (!password.trim()) {
      setError(t('auth.passwordRequired'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLength'))
      return
    }

    // Validacions per a nous usuaris
    if (isNewUser) {
      if (!email.trim()) {
        setError(t('auth.emailRequired'))
        return
      }

      // Validació bàsica d'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        setError(t('auth.emailInvalid'))
        return
      }

      if (!confirmPassword.trim()) {
        setError(t('auth.confirmPasswordRequired'))
        return
      }

      if (password !== confirmPassword) {
        setError(t('auth.passwordsDoNotMatch'))
        return
      }
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          nickname: nickname.trim(),
          email: isNewUser ? email.trim() : undefined,
          password: password,
          isNewUser: isNewUser
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Iniciar animació de transició
        setIsTransitioning(true)
        setTransitionPhase('expanding')
        
        // Animar el logo perquè creixi fins a ocupar tota la pantalla
        const expandDuration = 800 // 0.8 segons per expandir-se
        const expandStartTime = Date.now()
        const startScale = logoScale
        const startX = logoPosition.x
        const startY = logoPosition.y
        // Calcular escala per ocupar tota la pantalla (considerant que backgroundSize és un percentatge)
        const screenDiagonal = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight)
        const targetScale = screenDiagonal / 300 // Escala ajustada per ocupar tota la pantalla
        
        const expandAnimate = () => {
          const elapsed = Date.now() - expandStartTime
          const progress = Math.min(elapsed / expandDuration, 1)
          
          // Funció d'acceleració (ease-out)
          const easeOut = 1 - Math.pow(1 - progress, 3)
          
          // Creix el logo i el centra
          const currentScale = startScale + (targetScale - startScale) * easeOut
          const currentX = startX * (1 - easeOut)
          const currentY = startY * (1 - easeOut)
          
          setLogoScale(currentScale)
          setLogoPosition({ x: currentX, y: currentY })
          
          if (progress < 1) {
            requestAnimationFrame(expandAnimate)
          } else {
            // Guardar dades i navegar
            setStoredSession(data.nickname, data.socketToken)
            router.push('/app')
            
            // Guardar dades abans de continuar
            setStoredSession(data.nickname, data.socketToken)
            
            // Esperar un moment (simular càrrega de l'app) i després reduir el logo
            setTimeout(() => {
              setTransitionPhase('complete')
              
              // Animar el logo perquè torni cap enrere i desaparegui
              const shrinkDuration = 600
              const shrinkStartTime = Date.now()
              const shrinkStartScale = currentScale
              const shrinkStartX = currentX
              const shrinkStartY = currentY
              
              const shrinkAnimate = () => {
                const shrinkElapsed = Date.now() - shrinkStartTime
                const shrinkProgress = Math.min(shrinkElapsed / shrinkDuration, 1)
                
                // Funció d'acceleració (ease-in)
                const easeIn = shrinkProgress * shrinkProgress
                
                // Redueix el logo i el mou cap al centre fins a desaparèixer
                const shrinkScale = shrinkStartScale * (1 - easeIn)
                const shrinkX = shrinkStartX * (1 - easeIn)
                const shrinkY = shrinkStartY * (1 - easeIn)
                
                setLogoScale(shrinkScale)
                setLogoPosition({ x: shrinkX, y: shrinkY })
                
                if (shrinkProgress < 1) {
                  requestAnimationFrame(shrinkAnimate)
                } else {
                  // Navegar quan la reducció hagi acabat
                  setIsTransitioning(false)
                  router.push('/app')
                }
              }
              
              requestAnimationFrame(shrinkAnimate)
            }, 300) // Petit delay per simular la càrrega de l'app
          }
        }
        
        requestAnimationFrame(expandAnimate)
      } else {
        setError(data.error || t('auth.error'))
      }
    } catch (err) {
      setError(t('auth.connectionError'))
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setError('')

    if (!forgotPasswordEmail.trim()) {
      setError(t('auth.emailRequired'))
      setForgotPasswordLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forgotPasswordEmail.trim())) {
      setError(t('auth.emailInvalid'))
      setForgotPasswordLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setForgotPasswordSuccess(true)
        setError('')
      } else {
        setError(data.error || t('auth.forgotPasswordError'))
      }
    } catch (err) {
      setError(t('auth.connectionError'))
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 relative overflow-hidden transition-colors duration-500 ${
      isTransitioning && transitionPhase !== 'complete' ? 'bg-white dark:bg-white' : ''
    }`}>
      {/* Imatge de fons difuminada */}
      {/* Per modificar mida: canvia backgroundSize (actualment '90%' a mòbil, '60%' a desktop) */}
      {/* Per modificar opacitat: canvia opacity (actualment 60% a mòbil, 50% a desktop) */}
      {/* Per modificar blur: canvia blur (actualment blur-2xl a mòbil, blur-3xl a desktop) */}
      {/* Per modificar velocitat parallax: canvia el factor 2 (valors més alts = moviment més ràpid) */}
      {/* Animació automàtica: quan no hi ha scroll, el logo es mou i gira automàticament, alternant direcció */}
      <div 
        className={`absolute inset-0 bg-cover bg-top bg-no-repeat blur-2xl md:blur-3xl transition-transform duration-75 ease-out ${
          isTransitioning ? 'opacity-100' : 'opacity-60 md:opacity-50'
        } ${isTransitioning ? 'z-50' : ''}`}
        style={{
          backgroundImage: 'url(/logo_O.png)',
          backgroundSize: backgroundSize,
          transform: isScrolling 
            ? `translateY(${scrollY * 2}px) scale(${logoScale}) rotate(${logoRotation}deg)`
            : `translate(${logoPosition.x}px, ${logoPosition.y}px) scale(${logoScale}) rotate(${logoRotation}deg)`,
        }}
      />
      <div className={`relative z-10 w-full max-w-md transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl dark:shadow-gray-900 w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center flex-1 text-gray-800 dark:text-white">
            {t('auth.title')}
          </h1>
          <div className="flex-shrink-0">
            <LanguageSelector forceMobile={true} />
          </div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
          {t('auth.subtitle')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.nickname')}
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('auth.nicknamePlaceholder')}
              autoFocus
            />
          </div>
          {isNewUser && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>
          {!isNewUser && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
          )}
          {isNewUser && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
            </div>
          )}
          {error && (
            <div
              data-testid="auth-error"
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded"
            >
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isNewUser"
              checked={isNewUser}
              onChange={(e) => setIsNewUser(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isNewUser" className="text-sm text-gray-700 dark:text-gray-300">
              {t('auth.newUser')}
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            {isNewUser ? t('auth.register') : t('auth.enter')}
          </button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('auth.or')}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              signIn('google', { callbackUrl: '/app' })
            }}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {t('auth.continueWithGoogle')}
          </button>
        </form>
        </div>
      </div>

      {/* Modal de recuperació de contrasenya */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl dark:shadow-gray-900 w-full max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">
              {t('auth.forgotPasswordTitle')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('auth.forgotPasswordDescription')}
            </p>
            {forgotPasswordSuccess ? (
              <div>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4">
                  {t('auth.forgotPasswordSuccess')}
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordSuccess(false)
                  }}
                  className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                >
                  {t('common.close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgotPasswordEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('auth.email')}
                  </label>
                  <input
                    type="email"
                    id="forgotPasswordEmail"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('auth.emailPlaceholder')}
                    autoFocus
                  />
                </div>
                {error && (
                  <div
                    data-testid="forgot-error"
                    className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded"
                  >
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setForgotPasswordEmail('')
                      setError('')
                    }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
                  >
                    {forgotPasswordLoading ? t('common.loading') : t('auth.sendResetLink')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

