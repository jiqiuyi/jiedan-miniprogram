/**
 * 认证相关接口
 * - 微信手机号登录：/api/wechat/login
 * - 说明：phone 为微信 getPhoneNumber 解密后的手机号（由页面侧解密后传入）
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

/** 微信手机号登录（登录即注册；同手机号 = 同 uid）；inviteCode 仅首次注册时绑定一级邀请人 */
export function wechatLogin(
  phone: string,
  code?: string,
  nickname?: string,
  inviteCode?: string
): Promise<{ ok: boolean; data?: LoginResult; error?: string; statusCode: number }> {
  return post<LoginResult>(
    '/api/wechat/login',
    { phone, code: code || '', nickname: nickname || '', inviteCode: inviteCode || '' },
    { auth: false, silent: true }
  )
}
