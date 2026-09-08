/**
 * 数据同步接口
 * - GET /api/sync/pull?since=0  → 全量快照（只读）
 * - POST /api/sync/push        → 提交本端变更行 { tables: { '<table>': [row...] } }
 * 行格式：普通数据行带 _ts（毫秒时间戳）；删除行提交墓碑 { id, _deleted: true, _ts }。
 */
import { get, post } from '@/utils/request'
import type { DataRow } from '@/utils/types'

export interface SyncTables {
  customers?: unknown[]
  projects?: unknown[]
  quotes?: unknown[]
  payments?: unknown[]
}

export interface SyncPullResult {
  ok: boolean
  serverTs: number
  uid: number
  tables: SyncTables
}

export interface SyncPushResult {
  ok: boolean
  serverTs: number
  uid: number
}

/** 全量拉取用户业务数据（since=0 表示拉全量） */
export function pullAll(maxSince = 0) {
  return get<SyncPullResult>(`/api/sync/pull?since=${maxSince}`)
}

/**
 * 推送本地变更行到服务端。
 * @param tables 形如 { projects: [row...], payments: [...] }，键为表名
 */
export function pushChanges(tables: Record<string, DataRow[]>) {
  return post<SyncPushResult>('/api/sync/push', { tables })
}
