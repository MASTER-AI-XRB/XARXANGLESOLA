import { NextResponse } from 'next/server'

export const apiOk = <T>(data: T, status = 200) =>
  NextResponse.json(data, { status })

export const apiError = (
  message: string,
  status = 400,
  extras?: Record<string, unknown>
) => NextResponse.json({ error: message, ...extras }, { status })
