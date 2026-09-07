/**
 * 本地存储封装（唯一 storage 出口）
 * 页面 / store 不得直接调用 uni.setStorageSync 以外的裸 API，统一走这里，
 * 便于集中管理 key 与序列化。
 */
import { TOKEN_KEY, USER_KEY, SYNC_CACHE_KEY } from './config'

export const storage = {
  getToken(): string {
    return (uni.getStorageSync(TOKEN_KEY) as string) || ''
  },
  setToken(token: string) {
    uni.setStorageSync(TOKEN_KEY, token)
  },
  clearToken() {
    uni.removeStorageSync(TOKEN_KEY)
  },

  getUser<T = Record<string, unknown>>(): T | null {
    const raw = uni.getStorageSync(USER_KEY)
    if (!raw) return null
    try {
      return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
    } catch {
      return null
    }
  },
  setUser<T>(user: T) {
    uni.setStorageSync(USER_KEY, JSON.stringify(user))
  },
  clearUser() {
    uni.removeStorageSync(USER_KEY)
  },

  getSyncCache<T>(): T | null {
    const raw = uni.getStorageSync(SYNC_CACHE_KEY)
    if (!raw) return null
    try {
      return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
    } catch {
      return null
    }
  },
  setSyncCache<T>(data: T) {
    uni.setStorageSync(SYNC_CACHE_KEY, JSON.stringify(data))
  },
  clearSyncCache() {
    uni.removeStorageSync(SYNC_CACHE_KEY)
  },

  /** 清空全部登录相关状态（登出用） */
  clearAll() {
    this.clearToken()
    this.clearUser()
    this.clearSyncCache()
  }
}
