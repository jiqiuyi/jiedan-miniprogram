/**
 * 数据同步接口（MVP：全量只读拉取）
 * - GET /api/sync/pull?since=0  → 服务端返回该用户全部业务数据快照
 * - MVP 阶段只展示缓存，小程序不写本地库、不提供编辑入口
 */
import { get } from '@/utils/request'
import type { Customer, Project, Quote, Payment } from '@/utils/types'

export interface SyncTables {
  customers?: Customer[]
  projects?: Project[]
  quotes?: Quote[]
  payments?: Payment[]
}

export interface SyncPullResult {
  ok: boolean
  serverTs: number
  uid: number
  tables: SyncTables
}

/** 全量拉取用户业务数据（since=0 表示拉全量） */
export function pullAll(maxSince = 0) {
  return get<SyncPullResult>(`/api/sync/pull?since=${maxSince}`)
}
