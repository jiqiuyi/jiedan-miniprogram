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
import { TAG_SEED } from '@/utils/tag-helper'
import type {
  Customer,
  Project,
  Quote,
  Payment,
  Milestone,
  PendingCollection,
  Tag,
  CustomerTag,
  DataRow
} from '@/utils/types'

export type TableName =
  | 'customers'
  | 'projects'
  | 'quotes'
  | 'payments'
  | 'milestones'
  | 'pending_collections'

type AnyRow = Customer | Project | Quote | Payment | Milestone | PendingCollection

function nowTs(): number {
  return Date.now()
}

function nid(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 金额等可为 0 的数值（与 nid 区分：nid 会把 0 归零为正数判定用） */
function amt(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * 收款类型归一化为 App 枚举索引（0 定金 / 1 尾款 / 2 全额 / 3 自定义）。
 * App 同步行 type 存数字索引（PayType.index），此处必须写回索引，
 * 否则 App 端 Payment.fromMap 的 `as int?` 会因字符串取值抛类型错误。
 */
function payTypeIndex(v: unknown): number {
  const s = String(v ?? '').trim()
  if (s === '') return 0
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    return n >= 0 && n <= 3 ? n : 0
  }
  const named: Record<string, number> = { deposit: 0, balance: 1, full: 2, custom: 3 }
  return named[s] ?? 0
}

/** App 枚举索引 → 收款类型名（0 定金 / 1 尾款 / 2 全额 / 3 自定义） */
export const PAY_TYPE_NAMES = ['deposit', 'balance', 'full', 'custom'] as const

export const useDataStore = defineStore('data', () => {
  const customers = ref<Customer[]>([])
  const projects = ref<Project[]>([])
  const quotes = ref<Quote[]>([])
  const payments = ref<Payment[]>([])
  /** 项目里程碑 / 阶段（对齐 App milestones 表） */
  const milestones = ref<Milestone[]>([])
  const pendingCollections = ref<PendingCollection[]>([])
  /** 标签池（对齐 App tags 表；标签为本机语义数据，见 ensureTagsLoaded） */
  const tags = ref<Tag[]>([])
  /** 客户-标签关联（对齐 App customer_tags 表） */
  const customerTags = ref<CustomerTag[]>([])
  const loading = ref(false)
  const lastSyncTs = ref(0)

  function listOf(table: TableName): AnyRow[] {
    if (table === 'customers') return customers.value as unknown as AnyRow[]
    if (table === 'projects') return projects.value as unknown as AnyRow[]
    if (table === 'quotes') return quotes.value as unknown as AnyRow[]
    if (table === 'milestones') return milestones.value as unknown as AnyRow[]
    if (table === 'pending_collections') return pendingCollections.value as unknown as AnyRow[]
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
    // 里程碑表：同步表（对齐 App milestones），服务端返回时才覆盖
    if (Array.isArray(tables.milestones)) {
      milestones.value = (tables.milestones as AnyRow[]).filter((r) => !(r as DataRow)._deleted)
    }
    // 待收款表：服务端返回时才覆盖（兼容旧服务端不返回该表的情况）
    if (Array.isArray(tables.pending_collections)) {
      pendingCollections.value = (tables.pending_collections as AnyRow[]).filter(
        (r) => !(r as DataRow)._deleted
      )
    }
    // 标签表：本机语义为主，仅当服务端确实返回非空数据时才覆盖，避免暂无该表时清空本机标签
    if (Array.isArray(tables.tags) && tables.tags.length) {
      tags.value = (tables.tags as Tag[]).filter((r) => !(r as DataRow)._deleted)
    }
    if (Array.isArray(tables.customer_tags) && tables.customer_tags.length) {
      customerTags.value = (tables.customer_tags as CustomerTag[]).filter(
        (r) => !(r as DataRow)._deleted
      )
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
        // 服务端带回了标签表时同步写回本机缓存（标签语义本机优先）
        if (Array.isArray(tables.tags)) persistTags()
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
    // 级联清掉该客户的标签关联（对齐 App deleteCustomer 同时删 customer_tags）
    customerTags.value = customerTags.value.filter((r) => nid(r.customer_id) !== nid(id))
    persistTags()
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

  async function updateProject(
    id: number,
    patch: DataRow,
    opts?: { silent?: boolean }
  ): Promise<boolean> {
    const old = findLocal('projects', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ projects: [row] }))) return false
    upsertLocal('projects', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 删除项目：级联删除其收款记录与里程碑（对齐 App deleteProject） */
  async function removeProject(id: number): Promise<boolean> {
    const payIds = payments.value
      .filter((p) => nid((p as DataRow).project_id) === nid(id))
      .map((p) => nid((p as DataRow).id))
    const msIds = milestones.value
      .filter((m) => nid((m as DataRow).project_id) === nid(id))
      .map((m) => nid((m as DataRow).id))
    const ts = nowTs()
    const tables: Record<string, DataRow[]> = { projects: [{ id, _deleted: true, _ts: ts }] }
    if (payIds.length) tables.payments = payIds.map((pid) => ({ id: pid, _deleted: true, _ts: ts }))
    if (msIds.length) tables.milestones = msIds.map((mid) => ({ id: mid, _deleted: true, _ts: ts }))
    if (!(await pushRows(tables))) return false
    removeLocal('projects', id)
    payIds.forEach((pid) => removeLocal('payments', pid))
    msIds.forEach((mid) => removeLocal('milestones', mid))
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 报价 ----
  async function createQuote(data: DataRow, opts?: { silent?: boolean }): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('quotes')
    const row: DataRow = { ...data, id, created_at: ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ quotes: [row] }))) return false
    upsertLocal('quotes', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  async function updateQuote(id: number, patch: DataRow, opts?: { silent?: boolean }): Promise<boolean> {
    const old = findLocal('quotes', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = { ...old, ...patch, id, created_at: old.created_at || ts, updated_at: ts, _ts: ts }
    if (!(await pushRows({ quotes: [row] }))) return false
    upsertLocal('quotes', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
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

  // ---- 待收款（报价转待收款，对齐 App insertPendingCollection） ----
  async function createPendingCollection(data: DataRow, opts?: { silent?: boolean }): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('pending_collections')
    const row: DataRow = {
      status: 0,
      due_date: 0,
      settled_at: 0,
      ...data,
      id,
      created_at: (data.created_at as number) || ts,
      updated_at: ts,
      _ts: ts
    }
    if (!(await pushRows({ pending_collections: [row] }))) return false
    upsertLocal('pending_collections', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 结清待收尾款（对齐 App settlePending：status→1 + settled_at + updated_at） */
  async function settlePendingCollection(id: number): Promise<boolean> {
    const old = findLocal('pending_collections', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = {
      ...old,
      status: 1,
      settled_at: ts,
      updated_at: ts,
      _ts: ts
    }
    if (!(await pushRows({ pending_collections: [row] }))) return false
    upsertLocal('pending_collections', row)
    await afterCommit()
    return true
  }

  /** 删除待收记录（对齐 App deletePendingCollection：墓碑同步 + 本地剔除） */
  async function removePendingCollection(id: number): Promise<boolean> {
    const ts = nowTs()
    if (!(await pushRows({ pending_collections: [{ id, _deleted: true, _ts: ts }] }))) return false
    removeLocal('pending_collections', id)
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 收款 ----
  /**
   * 新增收款（对齐 App insertPayment + showPaymentDialog 落库字段）
   * 字段：project_id / amount（分）/ type（App 枚举索引）/ type_label / paid_at / note / reconciled / quote_id
   */
  async function createPayment(data: DataRow, opts?: { silent?: boolean }): Promise<boolean> {
    const ts = nowTs()
    const id = nextId('payments')
    const type = payTypeIndex(data.type)
    const row: DataRow = {
      reconciled: 0,
      note: '',
      quote_id: null,
      ...data,
      type,
      type_label: type === 3 ? String(data.type_label ?? '').trim() : '',
      paid_at: Number(data.paid_at) || ts,
      id,
      created_at: Number(data.created_at) || ts,
      updated_at: ts,
      _ts: ts
    }
    if (!(await pushRows({ payments: [row] }))) return false
    upsertLocal('payments', row)
    if (!opts?.silent) uni.showToast({ title: '已收款', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 删除收款（对齐 App deletePayment：墓碑同步 + 本地剔除） */
  async function removePayment(id: number): Promise<boolean> {
    const ts = nowTs()
    if (!(await pushRows({ payments: [{ id, _deleted: true, _ts: ts }] }))) return false
    removeLocal('payments', id)
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 某项目收款明细（对齐 App getPayments：paid_at 升序） */
  function paymentsOf(projectId: number): Payment[] {
    return payments.value
      .filter((p) => nid((p as DataRow).project_id) === nid(projectId))
      .sort((a, b) => nid((a as DataRow).paid_at) - nid((b as DataRow).paid_at))
  }

  /** 某项目已收总额（分），对齐 App projectPaidTotal */
  function paidTotalOf(projectId: number): number {
    return paymentsOf(projectId).reduce((s, p) => s + amt((p as DataRow).amount), 0)
  }

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

  // ---- 里程碑（对齐 App insertMilestone / updateMilestone / deleteMilestone） ----
  /** 某项目里程碑列表（对齐 App getMilestones：created_at 升序） */
  function milestonesOf(projectId: number): Milestone[] {
    return milestones.value
      .filter((m) => nid((m as DataRow).project_id) === nid(projectId))
      .sort((a, b) => nid((a as DataRow).created_at) - nid((b as DataRow).created_at))
  }

  /** 新建里程碑（name trim 后为空直接失败，对齐 App _addMilestone 的名称校验） */
  async function createMilestone(data: DataRow, opts?: { silent?: boolean }): Promise<boolean> {
    const name = String(data.name ?? '').trim()
    if (!name) return false
    const ts = nowTs()
    const id = nextId('milestones')
    const row: DataRow = {
      project_id: 0,
      amount: 0,
      done: 0,
      ...data,
      name,
      id,
      created_at: ts,
      updated_at: ts,
      _ts: ts
    }
    if (!(await pushRows({ milestones: [row] }))) return false
    upsertLocal('milestones', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 更新里程碑（name / amount / done 等） */
  async function updateMilestone(
    id: number,
    patch: DataRow,
    opts?: { silent?: boolean }
  ): Promise<boolean> {
    const old = findLocal('milestones', id)
    if (!old) return false
    const ts = nowTs()
    const row: DataRow = {
      ...old,
      ...patch,
      id,
      created_at: old.created_at || ts,
      updated_at: ts,
      _ts: ts
    }
    if (typeof patch.name === 'string') row.name = patch.name.trim()
    if (!(await pushRows({ milestones: [row] }))) return false
    upsertLocal('milestones', row)
    if (!opts?.silent) uni.showToast({ title: '已保存', icon: 'success' })
    await afterCommit()
    return true
  }

  /** 勾选 / 取消勾选里程碑（对齐 App _toggleMilestone：done 1↔0 静默写回） */
  async function toggleMilestone(id: number): Promise<boolean> {
    const old = findLocal('milestones', id)
    if (!old) return false
    const done = nid(old.done) === 1 ? 0 : 1
    return updateMilestone(id, { done }, { silent: true })
  }

  /** 删除里程碑（对齐 App _deleteMilestone） */
  async function removeMilestone(id: number): Promise<boolean> {
    const ts = nowTs()
    if (!(await pushRows({ milestones: [{ id, _deleted: true, _ts: ts }] }))) return false
    removeLocal('milestones', id)
    uni.showToast({ title: '已删除', icon: 'success' })
    await afterCommit()
    return true
  }

  // ---- 标签（tags / customer_tags，对齐 App 第19批 标签系统） ----
  let tagCacheLoaded = false

  /** App _seedTags 的 6 个预设标签（id 按顺序 1..6） */
  function defaultTags(): Tag[] {
    const ts = nowTs()
    return TAG_SEED.map((s, i) => ({
      id: i + 1,
      name: s.name,
      color: s.color,
      created_at: ts,
      updated_at: ts
    }))
  }

  /** 本机持久化（标签仅本机语义，不走服务端强依赖） */
  function persistTags() {
    storage.setTags({ tags: tags.value, customerTags: customerTags.value })
  }

  /** 首次载入本机标签；为空则写入 App 端预设标签池 */
  function ensureTagsLoaded() {
    if (tagCacheLoaded) return
    tagCacheLoaded = true
    const cached = storage.getTags<{ tags?: Tag[]; customerTags?: CustomerTag[] }>()
    const cachedTags = cached && Array.isArray(cached.tags) ? cached.tags : []
    const cachedLinks = cached && Array.isArray(cached.customerTags) ? cached.customerTags : []
    tags.value = cachedTags.length ? cachedTags : defaultTags()
    customerTags.value = cachedLinks
    persistTags()
  }

  function nextTagId(): number {
    return tags.value.reduce((m, t) => Math.max(m, nid(t.id)), 0) + 1
  }

  /** 关联行 id 约定：customer_id * 100000 + tag_id（对齐 App (customer_id, tag_id) 复合主键） */
  function ctRowId(customerId: number, tagId: number): number {
    return customerId * 100000 + tagId
  }

  /** 新建标签（对齐 App insertTag：name trim + ARGB 色值） */
  function createTag(name: string, color: number): number {
    const ts = nowTs()
    const id = nextTagId()
    const row: Tag = { id, name: name.trim(), color, created_at: ts, updated_at: ts }
    tags.value = [...tags.value, row]
    persistTags()
    // 服务端表名无关，尽力提交；失败不影响本机标签可用
    void pushRows({ tags: [row as unknown as DataRow] })
    return id
  }

  /** 修改标签名称 / 颜色 */
  function updateTag(id: number, patch: { name?: string; color?: number }): boolean {
    const idx = tags.value.findIndex((t) => nid(t.id) === nid(id))
    if (idx < 0) return false
    const ts = nowTs()
    const next: Tag = { ...tags.value[idx] }
    if (patch.name !== undefined) next.name = patch.name.trim()
    if (patch.color !== undefined) next.color = patch.color
    next.updated_at = ts
    tags.value = tags.value.map((t, i) => (i === idx ? next : t))
    persistTags()
    void pushRows({ tags: [next as unknown as DataRow] })
    return true
  }

  /** 删除标签（对齐 App deleteTag：同时清掉该标签与全部客户的关联） */
  function removeTag(id: number): boolean {
    const tid = nid(id)
    if (!tags.value.some((t) => nid(t.id) === tid)) return false
    tags.value = tags.value.filter((t) => nid(t.id) !== tid)
    customerTags.value = customerTags.value.filter((r) => nid(r.tag_id) !== tid)
    persistTags()
    void pushRows({ tags: [{ id: tid, _deleted: true, _ts: nowTs() }] })
    return true
  }

  /** 覆盖式保存某客户的标签（对齐 App setCustomerTags：先清后插） */
  function setCustomerTags(customerId: number, tagIds: number[]): void {
    const cid = nid(customerId)
    if (!cid) return
    customerTags.value = customerTags.value.filter((r) => nid(r.customer_id) !== cid)
    const ts = nowTs()
    const seen: number[] = []
    tagIds.forEach((v) => {
      const tid = nid(v)
      if (tid && !seen.includes(tid)) seen.push(tid)
    })
    const rows: CustomerTag[] = seen.map((tid) => ({
      id: ctRowId(cid, tid),
      customer_id: cid,
      tag_id: tid,
      created_at: ts,
      updated_at: ts
    }))
    customerTags.value = [...customerTags.value, ...rows]
    persistTags()
    if (rows.length) void pushRows({ customer_tags: rows as unknown as DataRow[] })
  }

  /** 单客户标签列表（对齐 App getCustomerTags） */
  function tagsOfCustomer(customerId: number): Tag[] {
    const cid = nid(customerId)
    if (!cid) return []
    const ids = customerTags.value
      .filter((r) => nid(r.customer_id) === cid)
      .map((r) => nid(r.tag_id))
    return tags.value.filter((t) => ids.includes(nid(t.id)))
  }

  /** 客户 → 标签列表映射（对齐 App tagsByCustomers，列表页批量展示用） */
  function tagsByCustomer(): Record<string, Tag[]> {
    const byId: Record<string, Tag> = {}
    tags.value.forEach((t) => {
      byId[String(nid(t.id))] = t
    })
    const map: Record<string, Tag[]> = {}
    customerTags.value.forEach((r) => {
      const tag = byId[String(nid(r.tag_id))]
      if (!tag) return
      const key = String(nid(r.customer_id))
      if (!map[key]) map[key] = []
      map[key].push(tag)
    })
    return map
  }

  // 标签池首次载入（预设标签自动落库）
  ensureTagsLoaded()

  return {
    customers,
    projects,
    quotes,
    payments,
    milestones,
    pendingCollections,
    tags,
    customerTags,
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
    createPendingCollection,
    settlePendingCollection,
    removePendingCollection,
    createPayment,
    removePayment,
    paymentsOf,
    paidTotalOf,
    updatePayment,
    milestonesOf,
    createMilestone,
    updateMilestone,
    toggleMilestone,
    removeMilestone,
    ensureTagsLoaded,
    createTag,
    updateTag,
    removeTag,
    setCustomerTags,
    tagsOfCustomer,
    tagsByCustomer
  }
})
