<template>
  <view class="page">
    <view v-if="fromTemplate" class="tip tpl-tip">已套用模板，可修改后保存为新的报价单</view>
    <view v-if="fromConvert" class="tip tpl-tip">已转为详细报价，可继续调整明细</view>

    <view class="card">
      <view class="cell">
        <text class="label">报价标题</text>
        <input v-model="title" class="field" placeholder="必填，如：官网设计报价" />
      </view>

      <view class="cell">
        <text class="label">所属客户</text>
        <picker class="picker" :range="customerNames" :value="customerIdx" @change="onCustomerChange">
          <view class="picker-value" :class="{ placeholder: customerIdx === 0 }">
            {{ customerNames[customerIdx] }}
          </view>
        </picker>
      </view>

      <view class="cell">
        <text class="label">关联项目</text>
        <picker class="picker" :range="projectNames" :value="projectIdx" @change="onProjectChange">
          <view class="picker-value" :class="{ placeholder: projectIdx === 0 }">
            {{ projectNames[projectIdx] }}
          </view>
        </picker>
      </view>

      <!-- 简单报价：金额直接填写；详细报价金额由明细 + 税率实时计算（对齐 App 两页签差异） -->
      <template v-if="!isFullQuote">
        <view class="cell">
          <text class="label">总金额（元）</text>
          <input v-model="totalYuan" class="field" type="digit" placeholder="0.00" />
        </view>

        <view class="cell">
          <text class="label">税率（%）</text>
          <input v-model="taxRate" class="field" type="digit" placeholder="0" />
          <text class="unit">%</text>
        </view>
      </template>

      <view class="cell">
        <text class="label">状态</text>
        <picker class="picker" :range="statusNames" :value="statusIdx" @change="onStatusChange">
          <view class="picker-value">{{ statusNames[statusIdx] }}</view>
        </picker>
      </view>

      <view class="cell col">
        <text class="label">备注</text>
        <textarea v-model="note" class="textarea" placeholder="补充说明（选填）" :maxlength="500" />
      </view>

      <view class="cell">
        <text class="label">报价单落款</text>
        <view class="sign-value" :class="{ placeholder: !signSummary }">{{ signSummary || '未设置' }}</view>
        <text class="cell-action" @tap="openSignature">{{ signSummary ? '修改' : '设置' }}</text>
      </view>

      <view class="cell col">
        <text class="label">参考图（可选）</text>
        <text class="ref-hint">插入本地参考图，仅保存在本机不上传，会随报价详情一起展示</text>
        <view v-if="imagePath" class="ref-row">
          <image class="ref-thumb" :src="imagePath" mode="aspectFill" @tap="viewImage" />
          <view class="ref-actions">
            <view class="ref-btn" @tap="viewImage">
              <text>查看大图</text>
            </view>
            <view class="ref-btn" @tap="removeImage">
              <text>移除</text>
            </view>
          </view>
        </view>
        <view v-else class="ref-pick" @tap="pickImage">
          <text>＋ 选择参考图</text>
        </view>
      </view>
    </view>

    <!-- 详细报价：费用项目明细（对齐 App _buildDetailTab 的费用项目区 + _LineCard） -->
    <template v-if="isFullQuote">
      <view class="sec-head">
        <text class="sec-title">费用项目</text>
        <view class="add-line" @tap="addLine">
          <text class="add-icon">＋</text>
          <text class="add-text">加一行</text>
        </view>
      </view>

      <view v-for="(line, idx) in lines" :key="line.key" class="card line-card">
        <view class="line-top">
          <view class="line-idx">{{ idx + 1 }}</view>
          <view class="line-name-col">
            <text class="line-label">项目名称</text>
            <input v-model="line.itemName" class="line-input" />
          </view>
          <view v-if="lines.length > 1" class="line-del" @tap="removeLine(idx)">
            <text class="del-icon">×</text>
          </view>
        </view>

        <view class="line-fields">
          <view class="line-col">
            <text class="line-label">工时(h)</text>
            <input v-model="line.hours" class="line-input" type="digit" />
          </view>
          <view class="line-col">
            <text class="line-label">单价(元/h)</text>
            <input v-model="line.rateYuan" class="line-input" type="digit" />
          </view>
          <view class="line-col">
            <text class="line-label">物料费(元)</text>
            <input v-model="line.materialYuan" class="line-input" type="digit" />
          </view>
        </view>

        <view class="line-sum">
          <text class="line-sum-label">费用小计</text>
          <text class="line-sum-value">¥{{ lineSubtotalText(line) }}</text>
        </view>
      </view>

      <!-- 适用税率（对齐 App 详细报价页签的税率卡片：右对齐输入 + % 后缀） -->
      <view class="card tax-card">
        <text class="tax-label">税率</text>
        <view class="tax-box">
          <input v-model="taxRate" class="tax-input" type="digit" placeholder="0" />
          <text class="tax-suffix">%</text>
        </view>
      </view>

      <!-- 汇总（对齐 App：主色底卡片 费用小计 / 税费 / 本次报价合计，实时计算） -->
      <view class="card sum-card">
        <view class="sum-row">
          <text class="sum-label">费用小计</text>
          <text class="sum-value">¥{{ subtotalText }}</text>
        </view>
        <view class="sum-row">
          <text class="sum-label">税费</text>
          <text class="sum-value">¥{{ taxText }}</text>
        </view>
        <view class="sum-divider"></view>
        <view class="sum-row">
          <text class="sum-label big">本次报价合计</text>
          <text class="sum-value big bold">¥{{ totalText }}</text>
        </view>
      </view>
    </template>

    <view class="actions">
      <button class="act-btn primary" @tap="onCopyText">生成并复制</button>
      <button class="act-btn tonal" :loading="saving" :disabled="saving" @tap="onSave">{{ saveLabel }}</button>
    </view>

    <!-- 落款设置弹层（对齐 App _editSignature 的 AlertDialog） -->
    <view v-if="sigVisible" class="sig-mask" @tap="closeSignature">
      <view class="sig-pop" @tap.stop>
        <text class="sig-title">报价单落款</text>
        <text class="sig-desc">显示在报价单底部，导出报价单时自动带上。</text>
        <text class="sig-label">落款名称</text>
        <input v-model="sigNameInput" class="sig-input" placeholder="如：李工 / 某某工作室" />
        <text class="sig-label">联系方式</text>
        <input v-model="sigContactInput" class="sig-input" placeholder="电话 / 微信 / 邮箱" />
        <view class="sig-actions">
          <view class="sig-btn" @tap="closeSignature">取消</view>
          <view class="sig-btn primary" @tap="confirmSignature">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import type { Quote, Customer, Project, DataRow, QuoteLine } from '@/utils/types'
import {
  buildSimpleQuoteText,
  buildFullQuoteText,
  lineSubtotal,
  linesSubtotal,
  readSignature,
  saveSignature
} from '@/utils/quote-helper'
import { formatAmount } from '@/utils/format'

const data = useDataStore()
const user = useUserStore()

const editId = ref(0)
const title = ref('')
const totalYuan = ref('')
const taxRate = ref('')
const note = ref('')
const statusIdx = ref(0)
const customerIdx = ref(0)
const projectIdx = ref(0)
const saving = ref(false)
const isFullQuote = ref(false)
/** 报价参考图本机路径（仅本机，不上传） */
const imagePath = ref('')
/** 报价单落款（本机持久化，key: quote_signature） */
const signName = ref('')
const signContact = ref('')
const sigVisible = ref(false)
const sigNameInput = ref('')
const sigContactInput = ref('')
const fromTemplate = ref(false)
/** 由「转为详细报价」流转进入（对齐 App _convertToFull：作为新报价重新出单） */
const fromConvert = ref(false)
/** 详细报价明细行（费用项目编辑区） */
const lines = ref<LineEdit[]>([])

/** 明细行编辑态：金额字段以「元」字符串保存，便于输入与实时计算 */
interface LineEdit {
  key: number
  itemName: string
  hours: string
  rateYuan: string
  materialYuan: string
}

/** 明细行 key 自增种子（稳定 v-for key，避免删行后输入框串值） */
let lineKeySeed = 1

function emptyLine(): LineEdit {
  return { key: lineKeySeed++, itemName: '', hours: '', rateYuan: '', materialYuan: '' }
}

/** 存量明细 → 编辑态（对齐 App _LineCardState：0 值不显示） */
function toLineEdit(l: QuoteLine): LineEdit {
  const hours = num(l.hours)
  const rate = num(l.hourRate)
  const material = num(l.materialFee)
  return {
    key: lineKeySeed++,
    itemName: String(l.itemName ?? ''),
    hours: hours ? String(hours) : '',
    rateYuan: rate ? centsToInput(rate) : '',
    materialYuan: material ? centsToInput(material) : ''
  }
}

/** 编辑态 → 明细行（分，字段与 App QuoteLine / lines_json 一致） */
function toQuoteLine(l: LineEdit): QuoteLine {
  return {
    itemName: l.itemName.trim(),
    hours: Number(l.hours) || 0,
    hourRate: Math.round((Number(l.rateYuan) || 0) * 100),
    materialFee: Math.round((Number(l.materialYuan) || 0) * 100)
  }
}

/** 载入已保存明细（对齐 App 详细报价编辑态的 lines 还原） */
function syncEditorLines(raw: string) {
  lines.value = parseLinesJson(raw).map(toLineEdit)
  if (isFullQuote.value && !lines.value.length) lines.value = [emptyLine()]
}

/** 当前明细（分，用于小计 / 落库 / 生成文本） */
const quoteLines = computed<QuoteLine[]>(() => lines.value.map(toQuoteLine))

/** 单行费用小计（分）：工时 × 单价 + 物料费（对齐 App QuoteLine.laborCost） */
function lineSubtotalCents(l: LineEdit): number {
  return lineSubtotal(toQuoteLine(l))
}

/** 单行费用小计文案（元） */
function lineSubtotalText(l: LineEdit): string {
  return formatAmount(lineSubtotalCents(l))
}

/** 详细报价实时汇总（分）：费用小计 / 税费 / 本次报价合计（对齐 App _subtotal / _tax / _total） */
const subtotalCents = computed(() => linesSubtotal(quoteLines.value))
const taxCents = computed(() =>
  Math.round((subtotalCents.value * Math.max(0, Number(taxRate.value) || 0)) / 100)
)
const totalCents = computed(() => subtotalCents.value + taxCents.value)
const subtotalText = computed(() => formatAmount(subtotalCents.value))
const taxText = computed(() => formatAmount(taxCents.value))
const totalText = computed(() => formatAmount(totalCents.value))

/** 加一行（对齐 App 费用项目区「加一行」：追加空明细行） */
function addLine() {
  lines.value.push(emptyLine())
}

/** 删行（对齐 App：仅剩一行时不显示删除入口，此处再兜底保护） */
function removeLine(idx: number) {
  if (lines.value.length <= 1) return
  lines.value.splice(idx, 1)
}

/** 该明细行是否有内容（用于「至少一项明细」校验与空行过滤） */
function hasLineContent(l: LineEdit): boolean {
  return Boolean(l.itemName.trim() || l.hours.trim() || l.rateYuan.trim() || l.materialYuan.trim())
}

const statusNames = ['草稿', '已发送', '客户确认', '已成交', '已作废']

const customers = computed(() => data.customers as Customer[])
const customerNames = computed(() => ['不关联客户', ...customers.value.map((c) => c.name || '未命名')])

const projects = computed(() => data.projects as Project[])
const projectNames = computed(() => ['不关联项目', ...projects.value.map((p) => p.title || '未命名')])

/** 落款摘要（名称 · 联系方式） */
const signSummary = computed(() => {
  const n = signName.value.trim()
  const c = signContact.value.trim()
  if (n && c) return `${n} · ${c}`
  return n || c
})

/** 底部保存按钮文案（对齐 App：新建=保存到历史 / 编辑=更新保存） */
const saveLabel = computed(() => (editId.value ? '更新保存' : '保存到历史'))

function centsToInput(cents: number | undefined): string {
  const n = Number(cents ?? 0)
  const v = Math.round(n) / 100
  return Number.isNaN(v) ? '' : String(v)
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  const sig = readSignature()
  signName.value = sig.name
  signContact.value = sig.contact
  if (query?.convert) {
    applyConvertPrefill()
    return
  }
  if (query?.tpl) {
    applyTemplatePrefill()
    return
  }
  // 项目详情页「报价单」入口：新建报价单并预选项目 / 标题（对齐 App QuotePage(initialProjectId, initialTitle)）
  if (query?.project_id) {
    const pid = Number(query.project_id)
    const pi = projects.value.findIndex((p) => Number(p.id) === pid)
    projectIdx.value = pi >= 0 ? pi + 1 : 0
    const t = String(query.title ?? '').trim()
    if (t) {
      try {
        title.value = decodeURIComponent(t)
      } catch {
        title.value = t
      }
    }
    return
  }
  if (!query?.id) return
  editId.value = Number(query.id)
  const q = (data.quotes as Quote[]).find((r) => Number(r.id) === editId.value)
  if (!q) {
    uni.showToast({ title: '报价单不存在', icon: 'none' })
    return
  }
  const row = q as DataRow
  title.value = q.title || ''
  totalYuan.value = centsToInput(num(row['total']))
  taxRate.value = String(num(row['tax_rate']))
  note.value = q.note || ''
  imagePath.value = String(row['image_path'] ?? '').trim()
  statusIdx.value = Math.max(0, Math.min(4, num(row['status'])))
  isFullQuote.value = String(row['quote_type'] ?? '') === 'full'
  syncEditorLines(String(row['lines_json'] ?? '[]'))
  const ci = customers.value.findIndex((c) => Number(c.id) === num(row['customer_id']))
  customerIdx.value = ci >= 0 ? ci + 1 : 0
  const pi = projects.value.findIndex((p) => Number(p.id) === num(row['project_id']))
  projectIdx.value = pi >= 0 ? pi + 1 : 0
})

/** 套用模板：读取模板预填数据，进入全新编辑态（不覆盖任何历史，对齐 App _applySimpleTemplate / _applyDetailTemplate） */
function applyTemplatePrefill() {
  let raw: unknown = ''
  try {
    raw = uni.getStorageSync('quote_tpl_apply')
    uni.removeStorageSync('quote_tpl_apply')
  } catch {
    raw = ''
  }
  if (!raw) return
  let obj: DataRow = {}
  try {
    obj = (typeof raw === 'string' ? JSON.parse(raw) : raw) as DataRow
  } catch {
    return
  }
  editId.value = 0
  fromTemplate.value = true
  title.value = String(obj['title'] ?? '')
  totalYuan.value = centsToInput(num(obj['total']))
  taxRate.value = String(num(obj['tax_rate']))
  note.value = String(obj['note'] ?? '')
  statusIdx.value = 0
  customerIdx.value = 0
  projectIdx.value = 0
  isFullQuote.value = String(obj['quote_type'] ?? '') === 'full'
  imagePath.value = String(obj['image_path'] ?? '').trim()
  syncEditorLines(String(obj['lines_json'] ?? '[]'))
  uni.showToast({ title: '已套用模板，可修改后保存为新的报价单', icon: 'none' })
}

/**
 * 「转为详细报价」流转预填：对齐 App _convertToFull ——
 * 作为新报价重新出单（不落库），标题沿用，金额自动生成一行明细
 * （项目名=报价对象名、工时 1、单价=原报价金额），税率归零，备注沿用。
 */
function applyConvertPrefill() {
  let raw: unknown = ''
  try {
    raw = uni.getStorageSync('quote_convert_apply')
    uni.removeStorageSync('quote_convert_apply')
  } catch {
    raw = ''
  }
  if (!raw) return
  let obj: DataRow = {}
  try {
    obj = (typeof raw === 'string' ? JSON.parse(raw) : raw) as DataRow
  } catch {
    return
  }
  editId.value = 0
  fromConvert.value = true
  isFullQuote.value = true
  title.value = String(obj['title'] ?? '')
  totalYuan.value = centsToInput(num(obj['total']))
  taxRate.value = String(num(obj['tax_rate']))
  note.value = String(obj['note'] ?? '')
  statusIdx.value = 0
  imagePath.value = String(obj['image_path'] ?? '').trim()
  const cid = num(obj['customer_id'])
  const ci = customers.value.findIndex((c) => Number(c.id) === cid)
  customerIdx.value = ci >= 0 ? ci + 1 : 0
  const pid = num(obj['project_id'])
  const pi = projects.value.findIndex((p) => Number(p.id) === pid)
  projectIdx.value = pi >= 0 ? pi + 1 : 0
  syncEditorLines(String(obj['lines_json'] ?? '[]'))
}

function onCustomerChange(e: { detail: { value: number | string } }) {
  customerIdx.value = Number(e.detail.value)
}

function onProjectChange(e: { detail: { value: number | string } }) {
  projectIdx.value = Number(e.detail.value)
}

function onStatusChange(e: { detail: { value: number | string } }) {
  statusIdx.value = Number(e.detail.value)
}

/** 选择本地参考图：从相册选图后复制到小程序本地持久目录（对齐 App _pickQuoteImage） */
function pickImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album'],
    success: (res) => {
      const temp = String((res.tempFilePaths as string[])[0] ?? '')
      if (!temp) return
      uni.saveFile({
        tempFilePath: temp,
        success: (saved: { savedFilePath?: string }) => {
          imagePath.value = String(saved.savedFilePath || temp)
          uni.showToast({ title: '参考图已添加（仅保存在本机，不上传）', icon: 'none' })
        },
        fail: () => {
          imagePath.value = temp
          uni.showToast({ title: '参考图已添加（临时文件，重启后可能失效）', icon: 'none' })
        }
      })
    }
  })
}

/** 移除参考图（仅清空表单中的本机路径，不删除磁盘文件，对齐 App _removeQuoteImage） */
function removeImage() {
  imagePath.value = ''
}

/** 查看参考图大图（对齐 App _viewQuoteImage） */
function viewImage() {
  const p = imagePath.value
  if (!p) return
  uni.previewImage({ urls: [p], current: p })
}

/** 报价对象名（对齐 App _simpleObjectName：报价标题 → 关联项目 → 关联客户） */
function objectName(): string {
  const t = title.value.trim()
  if (t) return t
  if (projectIdx.value > 0) return String(projects.value[projectIdx.value - 1]?.title ?? '')
  if (customerIdx.value > 0) return String(customers.value[customerIdx.value - 1]?.name ?? '')
  return ''
}

function parseLinesJson(raw: string): QuoteLine[] {
  try {
    const arr = JSON.parse(raw || '[]')
    return Array.isArray(arr) ? (arr as QuoteLine[]) : []
  } catch {
    return []
  }
}

/**
 * 拼装报价单文本：对齐 App buildSimpleQuoteText / buildQuoteText；
 * 备注（详细报价）、落款、联系方式为小程序侧附加，均仅在填写后追加。
 */
function buildQuoteTextForForm(): string {
  let s = ''
  if (isFullQuote.value) {
    const ls = quoteLines.value
    const rate = Math.max(0, Number(taxRate.value) || 0)
    s = buildFullQuoteText(
      objectName(),
      ls,
      rate,
      subtotalCents.value,
      taxCents.value,
      totalCents.value
    )
  } else {
    s = buildSimpleQuoteText(objectName(), Number(totalYuan.value) || 0, note.value)
  }
  let tail = ''
  const n = note.value.trim()
  if (isFullQuote.value && n) tail += `备注：${n}\n`
  const sn = signName.value.trim()
  const sc = signContact.value.trim()
  if (sn) tail += `落款：${sn}\n`
  if (sc) tail += `联系方式：${sc}\n`
  if (!tail) return s
  const greet = '请确认无误后回复，感谢合作！'
  const idx = s.lastIndexOf(greet)
  return idx >= 0 ? s.slice(0, idx) + tail + s.slice(idx) : s + tail
}

/** 生成并复制报价单文本（对齐 App _copySimpleToClipboard / _copyToClipboard） */
function onCopyText() {
  if (!objectName()) {
    uni.showToast({ title: '请先填写报价标题或关联客户/项目', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: buildQuoteTextForForm(),
    success: () => {
      uni.hideToast()
      uni.showToast({ title: '报价单已复制，去微信/邮件里粘贴给客户吧', icon: 'none' })
    }
  })
}

/** 打开落款设置（对齐 App _editSignature） */
function openSignature() {
  sigNameInput.value = signName.value
  sigContactInput.value = signContact.value
  sigVisible.value = true
}

function closeSignature() {
  sigVisible.value = false
}

/** 保存落款到本机（key: quote_signature，列表网页分享与报价文本共用） */
function confirmSignature() {
  const sig = { name: sigNameInput.value.trim(), contact: sigContactInput.value.trim() }
  saveSignature(sig)
  signName.value = sig.name
  signContact.value = sig.contact
  sigVisible.value = false
  uni.showToast({ title: '落款已保存', icon: 'none' })
}

async function onSave() {
  const t = title.value.trim()
  if (!t) {
    uni.showToast({ title: '请填写报价标题', icon: 'none' })
    return
  }
  // 详细报价：明细以编辑区为准（校验后落库）；简单报价沿用原明细，避免覆盖历史
  let linesJson = '[]'
  if (isFullQuote.value) {
    const rows = lines.value.filter(hasLineContent)
    if (!rows.length) {
      uni.showToast({ title: '请至少填写一项费用明细', icon: 'none' })
      return
    }
    const badIdx = lines.value.findIndex((l) => hasLineContent(l) && !l.itemName.trim())
    if (badIdx >= 0) {
      uni.showToast({ title: `第 ${badIdx + 1} 项明细请填写项目名称`, icon: 'none' })
      return
    }
    linesJson = JSON.stringify(rows.map(toQuoteLine))
  } else if (editId.value) {
    const old = (data.quotes as Quote[]).find((r) => Number(r.id) === editId.value) as DataRow | undefined
    linesJson = String(old?.['lines_json'] ?? '[]')
  }
  const payload: DataRow = {
    title: t,
    customer_id: customerIdx.value > 0 ? customers.value[customerIdx.value - 1].id : null,
    project_id: projectIdx.value > 0 ? projects.value[projectIdx.value - 1].id : null,
    quote_type: isFullQuote.value ? 'full' : 'simple',
    tax_include: 1,
    tax_rate: Math.max(0, Number(taxRate.value) || 0),
    // 详细报价：总金额取实时计算的「本次报价合计」；简单报价：取手填总金额
    total: isFullQuote.value ? totalCents.value : Math.round((Number(totalYuan.value) || 0) * 100),
    status: statusIdx.value,
    lines_json: linesJson,
    image_path: imagePath.value || null,
    note: note.value.trim() || null
  }
  saving.value = true
  try {
    const ok = editId.value
      ? await data.updateQuote(editId.value, payload)
      : await data.createQuote(payload)
    if (ok) uni.navigateBack()
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.tip {
  background: #fff7e8;
  color: #b7791f;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
}

.tpl-tip {
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 0 28rpx;
}

.cell {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f0f1f5;

  &:last-child {
    border-bottom: none;
  }

  &.col {
    flex-direction: column;
    align-items: stretch;
  }
}

.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #1f2430;
  flex-shrink: 0;
}

.cell.col .label {
  width: auto;
  margin-bottom: 12rpx;
}

.field {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.unit {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.picker {
  flex: 1;
}

.picker-value {
  font-size: 28rpx;
  color: #1f2430;
}

.picker-value.placeholder {
  color: #b6bcc9;
}

.textarea {
  width: 100%;
  min-height: 140rpx;
  font-size: 28rpx;
  color: #1f2430;
  background: #f8f9fc;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.ref-hint {
  font-size: 22rpx;
  color: #8a93a6;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.ref-row {
  display: flex;
  align-items: flex-start;
}

.ref-thumb {
  width: 240rpx;
  height: 240rpx;
  border-radius: 12rpx;
  background: #f8f9fc;
  flex-shrink: 0;
}

.ref-actions {
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}

.ref-btn {
  font-size: 26rpx;
  color: #4a5af0;
  padding: 10rpx 0;
}

.ref-pick {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  height: 72rpx;
  padding: 0 32rpx;
  border: 2rpx solid #4a5af0;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #4a5af0;
}

/* ============ 详细报价：费用项目明细（对齐 App _buildDetailTab + _LineCard） ============ */
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 28rpx 4rpx 12rpx;
}

.sec-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

.add-line {
  display: flex;
  align-items: center;
  padding: 8rpx 0 8rpx 16rpx;
}

.add-icon {
  font-size: 26rpx;
  font-weight: 600;
  color: #4a5af0;
}

.add-text {
  margin-left: 6rpx;
  font-size: 28rpx;
  color: #4a5af0;
}

.line-card {
  padding: 32rpx;
  margin-top: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.line-top {
  display: flex;
  align-items: center;
}

.line-idx {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.line-name-col {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
}

.line-del {
  width: 60rpx;
  height: 60rpx;
  margin-left: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.del-icon {
  font-size: 36rpx;
  line-height: 1;
  color: #8a93a6;
}

.line-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #8a93a6;
}

.line-fields {
  display: flex;
  margin-top: 24rpx;
}

.line-col {
  flex: 1;
  min-width: 0;

  & + .line-col {
    margin-left: 20rpx;
  }
}

.line-input {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  margin-top: 12rpx;
  padding: 0 20rpx;
  border: 2rpx solid rgba(138, 147, 166, 0.35);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #1f2430;
  box-sizing: border-box;
}

.line-sum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f1f5;
}

.line-sum-label {
  font-size: 26rpx;
  color: #8a93a6;
}

.line-sum-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

/* ============ 详细报价：适用税率 + 汇总（对齐 App _buildDetailTab 税率卡片与主色汇总卡片） ============ */
.tax-card {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
  margin-top: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.tax-label {
  font-size: 28rpx;
  color: #1f2430;
}

.tax-box {
  display: flex;
  align-items: center;
  margin-left: auto;
  width: 240rpx;
  border-bottom: 1rpx solid #e4e7ef;
}

.tax-input {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  text-align: right;
  font-size: 28rpx;
  color: #1f2430;
}

.tax-suffix {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: #8a93a6;
}

.sum-card {
  padding: 36rpx;
  margin-top: 12rpx;
  background: #4a5af0;
  box-shadow: 0 4rpx 16rpx rgba(74, 90, 240, 0.2);
}

.sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 0;
}

.sum-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

.sum-value {
  font-size: 28rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.sum-label.big {
  font-size: 28rpx;
  color: #fff;
}

.sum-value.big {
  font-size: 44rpx;
  color: #fff;
}

.sum-value.bold {
  font-weight: 700;
}

.sum-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.24);
  margin: 16rpx 0;
}

.actions {
  display: flex;
  margin-top: 40rpx;
}

.act-btn {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;

  &.primary {
    background: #4a5af0;
    color: #fff;
  }

  &.tonal {
    background: rgba(74, 90, 240, 0.12);
    color: #4a5af0;
  }

  & + .act-btn {
    margin-left: 20rpx;
  }
}

.act-btn::after {
  border: none;
}

.sign-value {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.sign-value.placeholder {
  color: #b6bcc9;
}

.cell-action {
  margin-left: 16rpx;
  font-size: 26rpx;
  color: #4a5af0;
}

.sig-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.sig-pop {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 36rpx 32rpx 24rpx;
  box-sizing: border-box;
}

.sig-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

.sig-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.5;
}

.sig-label {
  display: block;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.sig-input {
  margin-top: 10rpx;
  height: 80rpx;
  border: 2rpx solid #e4e7ef;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1f2430;
  box-sizing: border-box;
}

.sig-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 32rpx;
}

.sig-btn {
  padding: 12rpx 32rpx;
  font-size: 28rpx;
  color: #8a93a6;

  &.primary {
    color: #4a5af0;
    font-weight: 600;
  }
}
</style>
