/**
 * 业务数据状态（客户/项目/报价/收款）
 * - 只读：pullAll 全量拉取 + 本地缓存
 * - 写入：create/update/remove → pushChanges 提交服务端，成功后更新本地并触发 pull 刷新
 * 分层约束：页面只允许调用本 store 与 api 层，禁止直接 uni.request。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pullAll, pushChanges } from '@/api/sync'
import { storage } from '@/utils/storage'
import type { Customer, Project, Quote, Payment, DataRow } from '@/utils/types'

export type TableName = 'customers' | 'projects' | 'quotes' | 'payments'

type AnyRow = Customer | Project | Quote | Payment

function nowTs(): number {
  return Date.now()
}

function nid(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const useDataStore = defineStore('data', () => {
  const customers = ref<Customer[]>([])
  const projects = ref<Project[]>([])
  const quotes = ref<Quote[]>([])
  const payments = ref<Payment[]>([])
  const loading = ref(false)
  const lastSyncTs = ref(0)

  function listOf(table: TableName): AnyRow[] {
    if (table === 'customers') return customers.value as unknown as AnyRow[]
    if (table === 'projects') return projects.value as unknown as AnyRow[]
    if (table === 'quotes') return quotes.value as unknown as AnyRow[]
    return payments.value as unknown as AnyRow[]
  }

  /** 应用服务端快照/增量（覆盖对应表，墓碑行剔除） */
  function applyTables(tables: Record<string, unknown>, baseTs = 0) {
    if (Array.isArray(tables.customers)) {
      customers.value = (tables.customers as AnyRow[]).filter((r) => !(r as DataRow)._deleted)
    }
    if (Array.isArray(tables.projects)) {
      projects.value = (tables.projects as AnyRow[]).filter((r) => !(r as DataRow)._deleted)
    }
    if (Array.isArray(tables.quotes)) {
      quotes.value = (tables.quotes as AnyRow[]).filter((r) => !(r as DataRow)._deleted)
    }
    if (Array.isArray(tables.payments)) {
      payments.value = (tables.payments as AnyRow[]).filter((r) => !(r as DataRow)._deleted)
    }
    if (baseTs > 0) lastSyncTs.value = baseTs
  }

  /** 从服务端全量拉取（成功写缓存） */
  async function refresh(): Promise<boolean> {
    loading.value = true
    try {
      const res = await pullAll(0)
      if (res.ok && res.data) {
        const tables = res.data.tables as Record<string, unknown>
        applyTables(tables, res.data.serverTs || 0)
        storage.setSyncCache(tables as unknown as Record<string, unknown[]>)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  /** 恢复本地缓存（离线可看） */
  function loadCache() {
    const c = storage.getSyncCache()
    if (c) applyTables(c as unknown as Record<string, unknown>, 0)
  }

  /** 按 id 查行（跨表） */
  function findById(list: AnyRow[], id: number | string): AnyRow | undefined {
    return list.find((r) => nid((r as DataRow).id) === nid(id))
  }

  // ---------- 本地行操作 ----------
  function maxId(table: TableName): number {
    return listOf(table).reduce((m, r) => Math.max(m, nid((r as DataRow).id)), 0)
  }

  function nextId(table: TableName): number {
    return maxId(table) + 1
  }

  function findLocal(table: TableName, id: number): DataRow | undefined {
    return listOf(table).find((r) => nid((r as DataRow).id) === nid(id)) as DataRow | undefined
  }

  function upsertLocal(table: TableName, row: DataRow) {
    const arr = listOf(table)
    const idx = arr.findIndex((r) => nid((r as DataRow).id) === nid(row.id))
    if (idx >= 0) {
      arr[idx] = { ...(arr[idx] as DataRow), ...row } as AnyRow
    } else {
      arr.push(row as AnyRow)
    }
  }

  function removeLocal(table: TableName, id: number) {
    const arr = listOf(table)
    const idx = arr.findIndex((r) => nid((r as DataRow).id) === nid(id))
    if (idx >= 0) arr.splice(idx, 1)
  }

  // ---------- 服务端写入 ----------
  async function pushRows(tables: Record<string, DataRow[]>): Promise<boolean> {
    const res = await pushChanges(tables)
    return res.ok === true
  }

  /** 提交后刷新（尽力而为） */
  async function afterCommit() {
    try {
      await refresh()
    } catch {
      // 网络失败时不阻塞，本地已同步更新
    }
  }

  // ---- 客户 ----
  async function createCustomer(data: DataRow): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('customers')
    const row: DataRow = { ...data, id, created_at: ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ customers: [row] }))) return false
    upsertLocal('customers', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  async function updateCustomer(id: number, patch: DataRow): Promise<boolean> {
    const old = findLocal('customers', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ customers: [row] }))) return false
    upsertLocal('customers', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 删除客户：级联删除其名下项目与收款记录（对齐 App deleteCustomer） */
  async function removeCustomer(id: number): Promise<boolean> {
    const projIds = projects.value.filter((p) => nid((p as DataRow).customer_id) === nid(id)).map((p) => nid((p as DataRow).id))
    const payIds = projIds.length
      ? payments.value.filter((p) => projIds.includes(nid((p as DataRow).project_id))).map((p) => nid((p as DataRow).id))
      : []
    const ts = nowTs()
    const tables: Record<string, DataRow[]> = { customers: [{ id, _deleted: true, _ts: ts }] }
    if (projIds.length) tables.projects = projIds.map((pid) => ({ id: pid, _deleted: true, _ts: ts }))
    if (payIds.length) tables.payments = payIds.map((pid) => ({ id: pid, _deleted: true, _ts: ts }))
    if (!(await pushRows(tables))) return false
    removeLocal('customers', id)
    projIds.forEach((pid) => removeLocal('projects', pid))
    payIds.forEach((pid) => removeLocal('payments', pid))
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 项目 ----
  async function createProject(data: DataRow): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('projects')
    const row: DataRow = { ...data, id, created_at: ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ projects: [row] }))) return false
    upsertLocal('projects', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  async function updateProject(id: number, patch: DataRow): Promise<boolean> {
    const old = findLocal('projects', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ projects: [row] }))) return false
    upsertLocal('projects', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 删除项目：级联删除其收款记录（对齐 App deleteProject） */
  async function removeProject(id: number): Promise<boolean> {
    const payIds = payments.value
      .filter((p) => nid((p as DataRow).project_id) === nid(id))
      .map((p) => nid((p as DataRow).id))
    const ts = nowTs()
    const tables: Record<string, DataRow[]> = { projects: [{ id, _deleted: true, _ts: ts }] }
    if (payIds.length) tables.payments = payIds.map((pid) => ({ id: pid, _deleted: true, _ts: ts }))
    if (!(await pushRows(tables))) return false
    removeLocal('projects', id)
    payIds.forEach((pid) => removeLocal('payments', pid))
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 报价 ----
  async function createQuote(data: DataRow): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('quotes')
    const row: DataRow = { ...data, id, created_at: ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ quotes: [row] }))) return false
    upsertLocal('quotes', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  async function updateQuote(id: number, patch: DataRow): Promise<boolean> {
    const old = findLocal('quotes', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ quotes: [row] }))) return false
    upsertLocal('quotes', row)
    uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  async function removeQuote(id: number): Promise<boolean> {
    const ts = nowTs()
    const tables: Record<string, DataRow[]> = { quotes: [{ id, _deleted: true, _ts: ts }] }
    if (!(await pushRows(tables))) return false
    removeLocal('quotes', id)
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 收款 ----
  /** 更新收款行（对齐 App setPaymentReconciled：切换 reconciled 对账标记） */
  async function updatePayment(id: number, patch: DataRow): Promise<boolean> {
    const old = findLocal('payments', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ payments: [row] }))) return false
    upsertLocal('payments', row)
    await afterCommit()
    return true
  }

  return {
    customers,
    projects,
    quotes,
    payments,
    loading,
    lastSyncTs,
    applyTables,
    refresh,
    loadCache,
    findById,
    createCustomer,
    updateCustomer,
    removeCustomer,
    createProject,
    updateProject,
    removeProject,
    createQuote,
    updateQuote,
    removeQuote,
    updatePayment
  }
})
