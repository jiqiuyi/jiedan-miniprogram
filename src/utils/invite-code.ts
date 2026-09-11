/**
 * 邀请码工具（模块 A · 邀请关系绑定）
 * - 识别：专属链接 `?ic=JD1001`、`/invite/JD1001`、纯 `JD+数字` 文本
 * - 暂存：落地页 / 分享链接带入的邀请码先存本机，登录（注册）时自动预填
 * 约束：只计一级邀请关系；绑定由服务端在注册时完成，前端不做多级分润。
 */
import { storage } from './storage'

/** 本机暂存的待绑定邀请码 key */
const PENDING_INVITE_KEY = 'jiedan_pending_invite'

/** 从任意文本中识别合法邀请码（兼容链接与纯码） */
export function parseInviteCode(raw: string): string {
  const t = (raw || '').trim()
  if (!t || t.length > 300) return ''
  const m = /(?:[?&]ic=|\/invite\/)([A-Za-z0-9]{2,20})/.exec(t)
  if (m) return m[1].toUpperCase()
  const m2 = /JD\d{3,}/.exec(t.toUpperCase())
  return m2 ? m2[0] : ''
}

/** 暂存邀请码（同一码不重复写） */
export function savePendingInviteCode(code: string) {
  const c = parseInviteCode(code) || (code || '').trim().toUpperCase()
  if (!c) return
  if (getPendingInviteCode() === c) return
  storage.setJson(PENDING_INVITE_KEY, c)
}

/** 读取暂存的邀请码 */
export function getPendingInviteCode(): string {
  const v = storage.getJson<string>(PENDING_INVITE_KEY)
  return typeof v === 'string' ? v : ''
}

/** 清除暂存邀请码（注册成功或用户拒绝绑定后调用） */
export function clearPendingInviteCode() {
  if (!getPendingInviteCode()) return
  storage.remove(PENDING_INVITE_KEY)
}

/**
 * 解析页面 onLoad 参数中的邀请码并暂存。
 * 支持 options.ic / options.invite / options.code，以及二维码 scene（形如 `ic%3DJD1001`）。
 */
export function captureInviteFromOptions(options?: Record<string, unknown>): string {
  if (!options) return ''
  const raw = [options.ic, options.invite, options.code, options.scene]
    .map((v) => (v == null ? '' : String(v)))
    .join(' ')
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  const code = parseInviteCode(decoded) || parseInviteCode(raw)
  if (code) savePendingInviteCode(code)
  return code
}
