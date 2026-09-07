/**
 * 业务数据状态（MVP：报价/客户/项目 只读）
 * - 数据来源：/api/sync/pull 全量拉取
 * - 只做展示缓存，不做本地写库、不提供编辑/删除入口
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pullAll, type SyncPullResult } from '@/api/sync'
import { storage } from '@/utils/storage'
import type { Customer, Project, Quote, Payment } from '@/utils/types'

export const useDataStore = defineStore('data', () => {
  const customers = ref<Customer[]>([])
  const projects = ref<Project[]>([])
  const quotes = ref<Quote[]>([])
  const payments = ref<Payment[]>([])
  const serverTs = ref(0)
  const lastSyncAt = ref(0)
  const loading = ref(false)

  /** 从 sync 快照填充各表（只读缓存） */
  function applyTables(tables: SyncPullResult['tables']) {
    customers.value = (tables.customers || []) as Customer[]
    projects.value = (tables.projects || []) as Project[]
    quotes.value = (tables.quotes || []) as Quote[]
    payments.value = (tables.payments || []) as Payment[]
  }

  /** 启动/进入页面时拉全量数据；失败回退本地缓存 */
  async function refresh(): Promise<boolean> {
    if (loading.value) return false
    loading.value = true
    try {
      const res = await pullAll(0)
      if (res.ok && res.data) {
        applyTables(res.data.tables || {})
        serverTs.value = res.data.serverTs || 0
        lastSyncAt.value = Date.now()
        storage.setSyncCache({
          tabs: {
            customers: customers.value,
            projects: projects.value,
            quotes: quotes.value,
            payments: payments.value
          },
          serverTs: serverTs.value
        })
        return true
      }
      loadCache()
      return false
    } finally {
      loading.value = false
    }
  }

  /** 从本地缓存恢复（弱网/失败降级） */
  function loadCache() {
    const cached = storage.getSyncCache<{
      tabs?: {
        customers?: Customer[]
        projects?: Project[]
        quotes?: Quote[]
        payments?: Payment[]
      }
      serverTs?: number
    }>()
    if (!cached) return
    applyTables({
      customers: cached.tabs?.customers,
      projects: cached.tabs?.projects,
      quotes: cached.tabs?.quotes,
      payments: cached.tabs?.payments
    })
    serverTs.value = cached.serverTs || 0
  }

  /** 按 id 查单条（供详情页） */
  function findById<T extends Customer | Project | Quote>(
    list: T[],
    id: number | string
  ): T | undefined {
    const nid = Number(id)
    return list.find((r) => Number(r.id) === nid)
  }

  return {
    customers,
    projects,
    quotes,
    payments,
    serverTs,
    lastSyncAt,
    loading,
    refresh,
    loadCache,
    findById
  }
})
