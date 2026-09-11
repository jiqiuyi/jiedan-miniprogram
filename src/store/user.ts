/**
 * 用户状态（登录态、用户信息）
 * 约束：本模块只调用 api 层 / utils，不直接写请求逻辑。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { wechatLogin, type LoginUser } from '@/api/auth'
import { fetchMe, type MeData } from '@/api/user'
import { storage } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<LoginUser | null>(null)
  const me = ref<MeData | null>(null)
  const loggingIn = ref(false)

  const isLoggedIn = computed(() => !!token.value)

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

  /** 微信手机号登录（inviteCode 仅首次注册时绑定一级邀请人，绑后不可改） */
  async function login(
    phone: string,
    code?: string,
    nickname?: string,
    inviteCode?: string
  ): Promise<boolean> {
    if (loggingIn.value) return false
    loggingIn.value = true
    try {
      const res = await wechatLogin(phone, code, nickname, inviteCode)
      if (res.ok && res.data) {
        token.value = res.data.token
        userInfo.value = res.data.user
        storage.setToken(res.data.token)
        storage.setUser(res.data.user)
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
    restore,
    login,
    logout,
    fetchMeData
  }
})
