/**
 * 认证相关接口（正式版：手机号 + 密码）
 * - 登录：POST /api/login     参数 phone、password
 * - 注册：POST /api/register  参数 phone、password、nickname、inviteCode（inviteCode 选填）
 * 说明：与接单管家 App 使用同一后端账号体系，同一手机号 + 同一密码即可互通登录。
 */
import { post } from '@/utils/request'

export interface LoginUser {
  id: number
  phone: string
  nickname: string
  [key: string]: unknown
}

export interface LoginResult {
  ok: boolean
  token: string
  user: LoginUser
}

export type AuthResult = Promise<{
  ok: boolean
  data?: LoginResult
  error?: string
  statusCode: number
}>

/** 账号登录：手机号 + 密码 */
export function login(phone: string, password: string): AuthResult {
  return post<LoginResult>(
    '/api/login',
    { phone, password },
    { auth: false, silent: true }
  )
}

/** 账号注册：手机号 + 密码 + 昵称（必填）+ 好友邀请码（选填，仅首次注册绑定一级邀请人） */
export function register(
  phone: string,
  password: string,
  nickname: string,
  inviteCode?: string
): AuthResult {
  return post<LoginResult>(
    '/api/register',
    {
      phone,
      password,
      nickname,
      inviteCode: inviteCode || ''
    },
    { auth: false, silent: true }
  )
}
