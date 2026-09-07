/**
 * 用户状态（登录态、用户信息）
 * 约束：本模块只调用 api 层 / utils，不直接写请求逻辑。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { wechatLogin, type LoginUser } from '@/api/auth'
import { storage } from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<LoginUser | null>(null)
  const loggingIn = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  /** 从本地缓存恢复登录态（App onLaunch 调用） */
  function restore() {
    token.value = storage.getToken()
    userInfo.value = storage.getUser<LoginUser>()
  }

  /** 微信手机号登录 */
  async function login(phone: string, code?: string, nickname?: string): Promise<boolean> {
    if (loggingIn.value) return false
    loggingIn.value = true
    try {
      const res = await wechatLogin(phone, code, nickname)
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
    storage.clearAll()
    uni.reLaunch({ url: '/pages/login/login' })
  }

  return { token, userInfo, loggingIn, isLoggedIn, restore, login, logout }
})
