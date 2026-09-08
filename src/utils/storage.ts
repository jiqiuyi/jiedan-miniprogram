/**
 * 本地存储封装（唯一 storage 出口）
 * 页面 / store 不得直接调用 uni.setStorageSync 以外的裸 API，统一走这里，
 * 便于集中管理 key 与序列化。
 */
import {
  TOKEN_KEY,
  USER_KEY,
  SYNC_CACHE_KEY,
  WALLET_RECHARGE_KEY,
  WALLET_WITHDRAW_KEY,
  WALLET_ACCOUNT_KEY,
  PAYCODE_WX_KEY,
  PAYCODE_ALI_KEY
} from './config'

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

  getJson<T>(key: string): T | null {
    const raw = uni.getStorageSync(key)
    if (!raw) return null
    try {
      return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
    } catch {
      return null
    }
  },

  setJson(key: string, val: unknown) {
    uni.setStorageSync(key, JSON.stringify(val))
  },

  remove(key: string) {
    uni.removeStorageSync(key)
  },

  /** 清空全部登录相关状态（登出用，含钱包账本 / 收款码等本机账号数据） */
  clearAll() {
    this.clearToken()
    this.clearUser()
    this.clearSyncCache()
    uni.removeStorageSync(WALLET_RECHARGE_KEY)
    uni.removeStorageSync(WALLET_WITHDRAW_KEY)
    uni.removeStorageSync(WALLET_ACCOUNT_KEY)
    uni.removeStorageSync(PAYCODE_WX_KEY)
    uni.removeStorageSync(PAYCODE_ALI_KEY)
  }
}
