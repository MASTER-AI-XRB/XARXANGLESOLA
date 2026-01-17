// Gestió centralitzada d'errors

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    }
  }

  if (error instanceof Error) {
    // En producció, no revelar detalls de l'error
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'S\'ha produït un error. Si us plau, torna-ho a intentar.',
        statusCode: 500,
      }
    }
    return {
      message: error.message,
      statusCode: 500,
    }
  }

  return {
    message: 'Error desconegut',
    statusCode: 500,
  }
}

