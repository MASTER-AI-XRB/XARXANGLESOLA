const isDev = process.env.NODE_ENV !== 'production'

export const logError = (message: string, error?: unknown) => {
  if (!error) {
    console.error(message)
    return
  }

  if (isDev) {
    console.error(message, error)
    return
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(message, errorMessage)
}

export const logWarn = (message: string, error?: unknown) => {
  if (!error) {
    console.warn(message)
    return
  }

  if (isDev) {
    console.warn(message, error)
    return
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  console.warn(message, errorMessage)
}

export const logInfo = (message: string, data?: unknown) => {
  if (isDev) {
    if (data === undefined) {
      console.log(message)
    } else {
      console.log(message, data)
    }
  }
}
