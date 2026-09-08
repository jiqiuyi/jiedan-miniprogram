/**
 * 数据导出相关接口
 * - GET /api/sync/pull?since=0：当前账号的云端业务数据（按账号命名空间隔离，登录即可用）
 * - GET /api/export/all：全量数据备份快照（仅管理/作者 token 可用，普通账号无权限）
 * 页面调用统一静默 + 保留登录态，无权限时由页面如实提示。
 */
import { get } from '@/utils/request'

/** 拉取当前账号云端全部业务数据（since=0 即全量） */
export function fetchMySyncData() {
  return get<{ ok: boolean; serverTs: number; uid: number; tables: Record<string, unknown> }>(
    '/api/sync/pull?since=0',
    { silent: true }
  )
}

/** 全量备份（管理 / 作者专用） */
export function fetchExportAll() {
  return get<Record<string, unknown>>('/api/export/all', {
    silent: true,
    keepAuthOn401: true
  })
}
