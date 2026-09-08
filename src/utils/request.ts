/**
 * 请求封装（唯一 uni.request 出口）
 * 分层约束：页面 / store 禁止直接调用 uni.request，必须经由此处；
 * api 层调用本模块，统一携带 Authorization 头、统一错误提示。
 */
import { BASE_URL } from './config'
import { storage } from './storage'

export interface ApiResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  statusCode: number
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  auth?: boolean // 是否携带 token，默认 true
  silent?: boolean // 静默模式：不弹 toast（用于登录失败等需自主提示场景）
  keepAuthOn401?: boolean // 401 时保留登录态交由调用方处理（不弹窗 / 不清 token / 不跳登录），用于无权限类接口的页面级提示
}

function getErrorMsg(err: unknown): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const e = err as { errMsg?: string }
    if (e.errMsg) {
      const m = e.errMsg.replace(/^request:fail\s*/, '')
      return m.includes('timeout') ? '请求超时，请稍后重试' : m
    }
  }
  return '网络异常，请稍后重试'
}

export async function request<T = unknown>(
  options: RequestOptions
): Promise<ApiResult<T>> {
  const {
    url,
    method = 'GET',
    data,
    auth = true,
    silent = false,
    keepAuthOn401 = false
  } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (auth) {
    const token = storage.getToken()
    if (token) header['Authorization'] = `Bearer ${token}`
  }

  const raw = await new Promise<UniApp.RequestSuccessCallbackResult>(
    (resolve, reject) => {
      uni.request({
        url: `${BASE_URL}${url}`,
        method,
        data: data as UniApp.RequestOptions['data'],
        header,
        timeout: 15000,
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      })
    }
  )

  const body = raw.data as { ok?: boolean; error?: string } | null
  const statusCode = raw.statusCode

  if (statusCode >= 200 && statusCode < 300 && body && body.ok !== false) {
    return { ok: true, data: raw.data as T, statusCode }
  }

  // 401：登录失效
  if (statusCode === 401) {
    // 无权限类接口：保留登录态，由页面自行提示（如管理后台提示无权限）
    if (keepAuthOn401) {
      return { ok: false, error: body?.error || '未授权', statusCode }
    }
    storage.clearToken()
    if (!silent) {
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
    }
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/login' })
    }, 600)
    return { ok: false, error: body?.error || '未登录', statusCode }
  }

  const msg = body?.error || getErrorMsg('')
  if (!silent) {
    uni.showToast({ title: msg, icon: 'none' })
  }
  return { ok: false, error: msg, statusCode }
}

export async function get<T = unknown>(url: string, opts?: Partial<RequestOptions>) {
  return request<T>({ url, method: 'GET', ...opts })
}

export async function post<T = unknown>(url: string, data?: unknown, opts?: Partial<RequestOptions>) {
  return request<T>({ url, method: 'POST', data, ...opts })
}
