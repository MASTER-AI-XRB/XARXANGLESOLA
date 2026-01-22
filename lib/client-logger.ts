const isDev = process.env.NODE_ENV !== 'production'

export const logInfo = (message: string, data?: unknown) => {
  if (!isDev) return
  if (data === undefined) {
    console.log(message)
  } else {
    console.log(message, data)
  }
}

export const logWarn = (message: string, data?: unknown) => {
  if (data === undefined) {
    console.warn(message)
    return
  }
  if (isDev) {
    console.warn(message, data)
    return
  }
  const errorMessage = data instanceof Error ? data.message : String(data)
  console.warn(message, errorMessage)
}

export const logError = (message: string, data?: unknown) => {
  if (data === undefined) {
    console.error(message)
    return
  }
  if (isDev) {
    console.error(message, data)
    return
  }
  const errorMessage = data instanceof Error ? data.message : String(data)
  console.error(message, errorMessage)
}
