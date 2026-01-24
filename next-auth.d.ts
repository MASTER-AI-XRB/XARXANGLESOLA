import 'next-auth'

declare module 'next-auth' {
  interface Session {
    needsNickname?: boolean
    user?: {
      id?: string
      nickname?: string | null
    } & DefaultSession['user']
  }

  interface User {
    nickname?: string | null
  }
}
