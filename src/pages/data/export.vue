<template>
  <view class="page">
    <!-- 数据安全说明（对齐 App data_management_page.dart 首卡：盾牌图标 + 两段说明） -->
    <view class="card">
      <view class="sec-head">
        <text class="sec-icon">🛡️</text>
        <text class="sec-title">数据安全说明</text>
      </view>
      <text class="sec-body">
        本软件不会将数据保存在服务器，所有项目、客户、收款等数据都只保存在您自己的手机里。
      </text>
      <text class="sec-sub">
        为防止卸载软件清空数据，请在卸载前先导出备份，并将备份文件保存到网盘、文件管理器或微信等安全位置，重装后可导入恢复。
      </text>
    </view>

    <!-- 导出备份 -->
    <view class="card row" :class="{ disabled: busy }" @tap="onExport">
      <text class="row-icon">📤</text>
      <view class="row-main">
        <text class="row-title">导出备份</text>
        <text class="row-sub">将全部数据打包成文件，可分享保存到网盘/微信</text>
      </view>
      <text class="row-arrow">{{ busy ? '…' : '›' }}</text>
    </view>

    <!-- 导入恢复 -->
    <view class="card row" :class="{ disabled: busy }" @tap="onImport">
      <text class="row-icon">📥</text>
      <view class="row-main">
        <text class="row-title">导入恢复</text>
        <text class="row-sub">从备份文件恢复数据（会覆盖当前数据）</text>
      </view>
      <text class="row-arrow">›</text>
    </view>

    <!-- 数据库自检（对齐 App v1.23.0；小程序无本地数据库，等价检查本机数据缓存，全程只读） -->
    <view class="card row" :class="{ disabled: busy }" @tap="onHealthCheck">
      <text class="row-icon">🩺</text>
      <view class="row-main">
        <text class="row-title">数据库自检</text>
        <text class="row-sub">检查表结构完整性与数据可恢复性</text>
      </view>
      <text class="row-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 数据管理页：导出备份 / 导入恢复 / 数据库自检。
 * 对齐 App 正本 data_management_page.dart。
 * 等价处理说明：小程序无 SQLite 本地库、无系统文件选择器与分享面板，
 * 故备份以「本机数据缓存」为对象，导出用 wx.env.USER_DATA_PATH 落盘 + shareFileMessage 分享，
 * 导入用 chooseMessageFile 从聊天记录选 .json（等价 file_picker）。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { storage } from '@/utils/storage'

/** 备份文件标识（与 App BackupService 的 appId 语义一致，用于导入校验） */
const BACKUP_APP_ID = 'jiedan_guanjia'
const BACKUP_FORMAT_VERSION = 1

type Row = Record<string, unknown>

/** 备份表中文名（对齐 App describeBackup 的汇总口径，仅保留小程序侧存在的表） */
const TABLE_LABELS: { key: string; label: string }[] = [
  { key: 'customers', label: '客户' },
  { key: 'projects', label: '项目' },
  { key: 'quotes', label: '报价' },
  { key: 'payments', label: '收款' },
  { key: 'milestones', label: '里程碑' },
  { key: 'pending_collections', label: '待收款' },
  { key: 'tags', label: '标签' },
  { key: 'customer_tags', label: '客户标签关联' }
]

/** 小程序运行时未在 uni 类型声明中暴露的文件 / 分享能力（JSON 读写、聊天文件、文件分享） */
interface WxFileManager {
  writeFileSync: (filePath: string, data: string, encoding?: string) => void
  readFileSync: (filePath: string, encoding?: string) => string | ArrayBuffer
}
interface WxTempFile {
  path: string
  name?: string
}
interface WxLike {
  env?: { USER_DATA_PATH?: string }
  getFileSystemManager?: () => WxFileManager
  chooseMessageFile?: (opts: {
    count?: number
    type?: string
    extension?: string[]
    success?: (res: { tempFiles?: WxTempFile[] }) => void
    fail?: () => void
  }) => void
  shareFileMessage?: (opts: {
    filePath: string
    fileName?: string
    success?: () => void
    fail?: () => void
  }) => void
}

function getWx(): WxLike | undefined {
  return (globalThis as unknown as { wx?: WxLike }).wx
}

function field(row: unknown, key: string): unknown {
  return (row as Row | null)?.[key]
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 自检时间格式对齐 App _fmtTime：yyyy-MM-dd HH:mm */
function fmtNow(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
}

const user = useUserStore()
const busy = ref(false)

onShow(() => {
  // 已登录：先取云端最新数据作为备份来源；未登录：用本机缓存（离线也能导出/自检）
  if (user.isLoggedIn) void useDataStore().refresh()
  else useDataStore().loadCache()
})

// ---------------- 导出 ----------------

function collectTables(): Record<string, unknown[]> {
  const d = useDataStore()
  return {
    customers: d.customers as unknown[],
    projects: d.projects as unknown[],
    quotes: d.quotes as unknown[],
    payments: d.payments as unknown[],
    milestones: d.milestones as unknown[],
    pending_collections: d.pendingCollections as unknown[],
    tags: d.tags as unknown[],
    customer_tags: d.customerTags as unknown[]
  }
}

function countRows(tables: Record<string, unknown[]>): number {
  return Object.values(tables).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
}

/** 写入本机用户目录（对齐 App 导出到手机文件；失败返回空串） */
function writeBackupFile(fileName: string, text: string): string {
  const wxApi = getWx()
  const base = wxApi?.env?.USER_DATA_PATH
  if (!base || !wxApi?.getFileSystemManager) return ''
  try {
    const filePath = `${base}/${fileName}`
    wxApi.getFileSystemManager().writeFileSync(filePath, text, 'utf8')
    return filePath
  } catch {
    return ''
  }
}

async function onExport() {
  if (busy.value) return
  busy.value = true
  try {
    if (user.isLoggedIn) await useDataStore().refresh()
    const tables = collectTables()
    if (countRows(tables) === 0) {
      uni.showModal({
        title: '暂无可导出数据',
        content: '当前没有客户、项目、收款等数据，先在应用里录入后再导出备份。',
        showCancel: false,
        confirmText: '好的'
      })
      return
    }
    const text = JSON.stringify(
      {
        app: BACKUP_APP_ID,
        format_version: BACKUP_FORMAT_VERSION,
        exported_at: new Date().toISOString(),
        tables
      },
      null,
      2
    )
    const fileName = `jiedan_backup_${stamp()}.json`
    const filePath = writeBackupFile(fileName, text)
    if (!filePath) {
      // 环境不支持写文件（如 H5 预览）：退化为复制备份内容，保证数据可带走
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showModal({
            title: '已复制备份内容',
            content: '当前环境不支持生成备份文件，备份内容已复制到剪贴板，可粘贴进文件后保存。',
            showCancel: false,
            confirmText: '好的'
          })
        }
      })
      return
    }
    const wxApi = getWx()
    if (!wxApi?.shareFileMessage) {
      uni.showModal({
        title: '备份文件已生成',
        content: `备份文件已生成（${filePath}）。当前环境不支持直接分享，可在微信开发者工具中查看该文件。`,
        showCancel: false,
        confirmText: '好的'
      })
      return
    }
    // 对齐 App：先提示「备份文件已生成（路径），正在弹出分享」，再拉起分享
    uni.showModal({
      title: '备份文件已生成',
      content: `备份文件已生成（${filePath}），正在弹出分享`,
      showCancel: false,
      confirmText: '好的',
      success: () => {
        wxApi.shareFileMessage?.({
          filePath,
          fileName,
          success: () => uni.showToast({ title: '备份文件已发送', icon: 'success' }),
          fail: () => uni.showToast({ title: '已取消分享', icon: 'none' })
        })
      }
    })
  } finally {
    busy.value = false
  }
}

// ---------------- 导入 ----------------

function readFileText(path: string): string {
  const wxApi = getWx()
  if (!wxApi?.getFileSystemManager) return ''
  try {
    const res = wxApi.getFileSystemManager().readFileSync(path, 'utf8')
    return typeof res === 'string' ? res : ''
  } catch {
    return ''
  }
}

function parseBackup(text: string): Record<string, unknown[]> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as { app?: unknown; tables?: unknown }
  if (obj.app !== BACKUP_APP_ID) return null
  if (!obj.tables || typeof obj.tables !== 'object' || Array.isArray(obj.tables)) return null
  return obj.tables as Record<string, unknown[]>
}

function describeTables(tables: Record<string, unknown[]>): string {
  const parts: string[] = []
  TABLE_LABELS.forEach(({ key, label }) => {
    const arr = tables[key]
    if (Array.isArray(arr) && arr.length) parts.push(`${label} ${arr.length} 条`)
  })
  return parts.length ? `恢复完成：${parts.join('、')}` : '恢复完成：备份文件中没有可恢复的业务数据'
}

/** 导入落地：写入本机缓存并覆盖内存数据（对齐 App importBackup 清表后写入） */
function applyImport(tables: Record<string, unknown[]>) {
  const data = useDataStore()
  storage.setSyncCache(tables)
  data.applyTables(tables as Record<string, unknown>, 0)
  // 标签为本机独立缓存，随导入一并落盘
  if (Array.isArray(tables.tags) || Array.isArray(tables.customer_tags)) {
    storage.setTags({ tags: data.tags, customerTags: data.customerTags })
  }
  // 防篡改加固（对齐 App 导入后强制清 token / 会话，VIP 以云端 me() 为准）
  user.token = ''
  user.userInfo = null
  storage.clearToken()
  storage.clearUser()
  uni.showModal({
    title: '导入成功',
    content: `${describeTables(tables)}\n\n安全提示：为保护账号权益，导入后已退出登录，VIP 状态将以云端账号为准，请重新登录。`,
    showCancel: false,
    confirmText: '好的',
    success: () => {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  })
}

function onImport() {
  if (busy.value) return
  const wxApi = getWx()
  if (!wxApi?.chooseMessageFile) {
    uni.showModal({
      title: '当前环境不支持选择文件',
      content: '导入需在微信小程序内使用：从聊天记录中选择本应用导出的 .json 备份文件。',
      showCancel: false,
      confirmText: '好的'
    })
    return
  }
  wxApi.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['json'],
    success: (res) => {
      const file = (res.tempFiles || [])[0]
      if (!file) return
      const name = file.name || file.path || ''
      if (!/\.json$/i.test(name)) {
        uni.showModal({
          title: '无法读取所选文件',
          content: '只能选择 .json 格式的备份文件，请重新选择。',
          showCancel: false,
          confirmText: '好的'
        })
        return
      }
      const text = readFileText(file.path)
      if (!text) {
        uni.showModal({
          title: '无法读取所选文件',
          content: '无法读取所选文件，请确认它是本应用导出的 .json 备份文件。',
          showCancel: false,
          confirmText: '好的'
        })
        return
      }
      const tables = parseBackup(text)
      if (!tables) {
        uni.showModal({
          title: '无法读取所选文件',
          content: '所选文件不是有效的接单管家备份文件，请确认来源后重试。',
          showCancel: false,
          confirmText: '好的'
        })
        return
      }
      uni.showModal({
        title: '确认导入恢复？',
        content:
          '导入会清空当前手机上的客户、项目、收款等全部数据，并用备份文件内容覆盖。建议先导出当前数据再导入。',
        cancelText: '取消',
        confirmText: '确认导入',
        success: (r) => {
          if (!r.confirm) return
          busy.value = true
          try {
            applyImport(tables)
          } catch (e) {
            uni.showToast({ title: `导入失败：${String(e)}`, icon: 'none' })
          } finally {
            busy.value = false
          }
        }
      })
    },
    fail: () => {
      // 用户取消选择，不打扰
    }
  })
}

// ---------------- 数据库自检（等价：本机数据缓存只读体检） ----------------

interface HealthReport {
  integrityIssues: string[]
  dangling: number
  totalRows: number
}

function runHealthCheck(): HealthReport {
  const tables = collectTables()
  const issues: string[] = []

  const idSet = (rows: unknown[]): Set<string> =>
    new Set(rows.map((r) => String(field(r, 'id') ?? '')))

  TABLE_LABELS.forEach(({ key, label }) => {
    const arr = tables[key]
    if (!Array.isArray(arr)) return
    const bad = arr.filter((r) => {
      const id = Number(field(r, 'id'))
      return !(Number.isFinite(id) && id > 0)
    }).length
    if (bad > 0) issues.push(`${label}：${bad} 行缺少有效主键`)
  })

  const customerIds = idSet(tables.customers || [])
  const projectIds = idSet(tables.projects || [])
  const tagIds = idSet(tables.tags || [])
  let dangling = 0
  dangling += (tables.projects || []).filter((r) => !customerIds.has(String(field(r, 'customer_id') ?? ''))).length
  dangling += (tables.payments || []).filter((r) => !projectIds.has(String(field(r, 'project_id') ?? ''))).length
  dangling += (tables.milestones || []).filter((r) => !projectIds.has(String(field(r, 'project_id') ?? ''))).length
  dangling += (tables.customer_tags || []).filter(
    (r) => !customerIds.has(String(field(r, 'customer_id') ?? '')) || !tagIds.has(String(field(r, 'tag_id') ?? ''))
  ).length

  return { integrityIssues: issues, dangling, totalRows: countRows(tables) }
}

function onHealthCheck() {
  if (busy.value) return
  const report = runHealthCheck()
  const healthy = report.integrityIssues.length === 0 && report.dangling === 0
  const lines = [
    `检查时间：${fmtNow()}`,
    `缓存完整性：${report.integrityIssues.length === 0 ? '正常' : `异常：${report.integrityIssues.join('；')}`}`,
    `引用完整性：${report.dangling === 0 ? '正常' : `发现 ${report.dangling} 处问题`}`,
    `数据量：共 ${report.totalRows} 条记录`,
    '说明：小程序无本地数据库，本项检查的是本机数据缓存（存储完整性 / 引用校验 / 数据量），全程只读。',
    '',
    healthy
      ? '数据完整可正常使用。为防手机丢失 / 卸载清空，建议定期到「导出备份」将数据另存到网盘或微信。'
      : '检测到异常，当前不影响继续使用；为稳妥建议先「导出备份」，必要时可在本页做一次恢复演练，并联系开发者排查。'
  ]
  uni.showModal({
    title: healthy ? '数据库自检通过' : '数据库自检发现异常',
    content: lines.join('\n'),
    showCancel: false,
    confirmText: '知道了'
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.sec-head {
  display: flex;
  align-items: center;
}

.sec-icon {
  font-size: 34rpx;
  margin-right: 12rpx;
}

.sec-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.sec-body {
  display: block;
  margin-top: 20rpx;
  font-size: 27rpx;
  line-height: 1.6;
  color: #3a4150;
}

.sec-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 27rpx;
  line-height: 1.6;
  color: #8a93a6;
}

.row {
  display: flex;
  align-items: center;
}

.row.disabled {
  opacity: 0.6;
}

.row-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.row-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.row-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #8a93a6;
}

.row-arrow {
  margin-left: 16rpx;
  font-size: 40rpx;
  color: #b6bcc9;
}
</style>
