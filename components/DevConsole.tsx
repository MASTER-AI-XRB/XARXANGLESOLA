'use client'

import { useState, useEffect } from 'react'

export default function DevConsole() {
  const [logs, setLogs] = useState<Array<{ type: string; message: string; timestamp: string }>>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    // Interceptar console.log, console.error, console.warn
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    const addLog = (type: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      setLogs(prev => [...prev.slice(-49), {
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }])
    }

    console.log = (...args: any[]) => {
      originalLog(...args)
      addLog('log', ...args)
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      addLog('error', ...args)
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      addLog('warn', ...args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <>
      {/* Botó fix al costat esquerre just per sobre del quadre de text */}
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="fixed left-0 z-50 bg-gray-800 dark:bg-gray-700 text-white px-3 py-2 rounded-r-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition opacity-30 hover:opacity-100"
        title="Eines de desenvolupament"
        style={{ bottom: 'calc(4rem + 1rem)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      {/* Drawer lateral */}
      {isDrawerOpen && (
        <>
          {/* Overlay per tancar el drawer */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header del drawer */}
            <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
              <span className="font-bold text-gray-900 dark:text-white">Eines de Desenvolupament</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contingut del drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Botó per obrir/tancar la consola */}
              <button
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className="w-full bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition"
              >
                {isConsoleOpen ? 'Ocultar Logs' : 'Mostrar Logs'}
              </button>

              {/* Consola */}
              {isConsoleOpen && (
                <div className="w-full h-96 bg-black bg-opacity-90 text-white text-xs font-mono overflow-auto rounded-lg shadow-xl border border-gray-600 flex flex-col">
                  <div className="sticky top-0 bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-600">
                    <span className="font-bold">Console Logs</span>
                    <button
                      onClick={() => setLogs([])}
                      className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                    >
                      Esborrar
                    </button>
                  </div>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">No hi ha logs encara</div>
                    ) : (
                      logs.map((log, index) => (
                        <div
                          key={index}
                          className={`${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'warn' ? 'text-yellow-400' :
                            'text-green-400'
                          } break-words`}
                        >
                          <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

