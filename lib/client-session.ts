const isBrowser = typeof window !== 'undefined'

export const getStoredNickname = () =>
  isBrowser ? window.localStorage.getItem('nickname') : null

export const getStoredSocketToken = () =>
  isBrowser ? window.localStorage.getItem('socketToken') : null

export const setStoredSession = (nickname: string, socketToken?: string | null) => {
  if (!isBrowser) return
  window.localStorage.setItem('nickname', nickname)
  if (socketToken) {
    window.localStorage.setItem('socketToken', socketToken)
  } else {
    window.localStorage.removeItem('socketToken')
  }
}

export const clearStoredSession = () => {
  if (!isBrowser) return
  window.localStorage.removeItem('nickname')
  window.localStorage.removeItem('socketToken')
}
