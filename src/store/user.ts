/**
 * 用户状态（登录态、用户信息）
 * 约束：本模块只调用 api 层 / utils，不直接写请求逻辑。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  login as apiLogin,
  register as apiRegister,
  type LoginUser,
  type LoginResult
} from '@/api/auth'
import { fetchMe, type MeData } from '@/api/user'
import { storage } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<LoginUser | null>(null)
  const me = ref<MeData | null>(null)
  const loggingIn = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  /** 专业版状态（后端账号资料返回 isPro，兼容 true / 1 / '1' 三种取值） */
  const isPro = computed(() => {
    const u = (userInfo.value ?? {}) as Record<string, unknown>
    return u['isPro'] === true || u['isPro'] === 1 || u['isPro'] === '1'
  })

  /** 从本地缓存恢复登录态（App onLaunch 调用） */
  function restore() {
    token.value = storage.getToken()
    userInfo.value = storage.getUser<LoginUser>()
  }

  /** 拉取账号资料（专业版状态 / 邀请码 / 邀请关系 / 订单），成功即合并到 userInfo */
  async function fetchMeData(): Promise<boolean> {
    if (!token.value) return false
    const res = await fetchMe()
    if (!res.ok || !res.data) return false
    me.value = res.data
    const u = res.data.user as unknown as Record<string, unknown>
    const base = (userInfo.value ?? {}) as Record<string, unknown>
    userInfo.value = { ...base, ...u } as LoginUser
    storage.setUser(userInfo.value)
    return true
  }

  /** 写入登录态（登录 / 注册共用） */
  function applyAuth(data: LoginResult) {
    token.value = data.token
    userInfo.value = data.user
    storage.setToken(data.token)
    storage.setUser(data.user)
  }

  /** 统一提交：加锁、成功后写入登录态、失败弹提示 */
  async function runAuth(
    submit: () => Promise<{ ok: boolean; data?: LoginResult; error?: string }>
  ): Promise<boolean> {
    if (loggingIn.value) return false
    loggingIn.value = true
    try {
      const res = await submit()
      if (res.ok && res.data) {
        applyAuth(res.data)
        return true
      }
      if (res.error) {
        uni.showToast({ title: res.error, icon: 'none' })
      }
      return false
    } finally {
      loggingIn.value = false
    }
  }

  /** 账号登录：手机号 + 密码（与 App 同账号体系） */
  async function login(phone: string, password: string): Promise<boolean> {
    return runAuth(() => apiLogin(phone, password))
  }

  /** 账号注册：手机号 + 密码 + 昵称（必填）+ 好友邀请码（选填，绑后不可改） */
  async function register(
    phone: string,
    password: string,
    nickname: string,
    inviteCode?: string
  ): Promise<boolean> {
    return runAuth(() => apiRegister(phone, password, nickname, inviteCode))
  }

  /** 登出（清理本地状态） */
  function logout() {
    token.value = ''
    userInfo.value = null
    me.value = null
    storage.clearAll()
    uni.reLaunch({ url: '/pages/login/login' })
  }

  return {
    token,
    userInfo,
    me,
    loggingIn,
    isLoggedIn,
    isPro,
    restore,
    login,
    register,
    logout,
    fetchMeData
  }
})
