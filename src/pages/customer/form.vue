<template>
  <view class="page">
    <view class="card">
      <view class="cell">
        <text class="label">客户名称 *</text>
        <input v-model="name" class="field" placeholder="如：李明工作室" :maxlength="40" />
      </view>
      <view class="cell">
        <text class="label">联系方式</text>
        <input v-model="contact" class="field" placeholder="微信 / 手机号" />
      </view>
      <view class="cell">
        <text class="label">行业</text>
        <input v-model="industry" class="field" placeholder="如：餐饮、电商、装修" />
      </view>
      <view class="cell">
        <text class="label">客户来源</text>
        <input v-model="source" class="field" placeholder="如：朋友介绍、小红书、老客" />
      </view>
      <view class="cell">
        <text class="label">所在地</text>
        <input v-model="location" class="field" placeholder="如：杭州" />
      </view>

      <view class="cell">
        <text class="label">最近联系时间</text>
        <picker
          class="picker-box"
          mode="date"
          :value="contactDate"
          start="2020-01-01"
          :end="todayStr"
          @change="onPickContactDate"
        >
          <view class="picker-row">
            <text :class="['picker-text', lastContactAt > 0 ? '' : 'is-placeholder']">
              {{ lastContactAt > 0 ? contactDate : '未设置' }}
            </text>
            <text class="chevron">›</text>
          </view>
        </picker>
        <text v-if="lastContactAt > 0" class="clear-btn" @tap="clearContactDate">清除</text>
      </view>

      <view class="cell col">
        <text class="label">备注</text>
        <textarea
          v-model="note"
          class="textarea"
          placeholder="偏好、价格敏感度等"
          :maxlength="500"
        />
      </view>
    </view>

    <view class="actions">
      <button class="btn btn-ghost" :disabled="saving" @tap="onCancel">取消</button>
      <button
        class="btn btn-primary"
        :class="{ 'is-disabled': !canSave }"
        :disabled="saving"
        :loading="saving"
        @tap="onSave"
      >保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/format'
import type { Customer, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const editId = ref(0)
const name = ref('')
const contact = ref('')
const industry = ref('')
const source = ref('')
const location = ref('')
const note = ref('')
/** 最近联系时间（毫秒，取当日零点；0 = 未设置，对齐 App newLastContactAt） */
const lastContactAt = ref(0)
const saving = ref(false)

/** 日期选择器上限（对齐 App lastDate: now） */
const todayStr = (() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
})()

const contactDate = computed(() =>
  lastContactAt.value > 0 ? formatDate(lastContactAt.value) : todayStr
)

/** 名称必填（对齐 App：名称为空时保存不可用） */
const canSave = computed(() => name.value.trim().length > 0)

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  editId.value = Number(query?.id || 0)
  uni.setNavigationBarTitle({ title: editId.value ? '编辑客户' : '新建客户' })
  await data.refresh()
  if (!editId.value) return
  const c = (data.customers as Customer[]).find((r) => Number(r.id) === editId.value)
  if (!c) {
    uni.showToast({ title: '客户不存在', icon: 'none' })
    return
  }
  name.value = c.name || ''
  contact.value = c.contact || ''
  industry.value = c.industry || ''
  source.value = c.source || ''
  location.value = c.location || ''
  note.value = c.note || ''
  lastContactAt.value = Number((c as DataRow)['last_contact_at'] || 0)
})

/** 选中日期 → 存当日零点毫秒（对齐 App DateTime(y,m,d).millisecondsSinceEpoch） */
function onPickContactDate(e: { detail: { value: string } }) {
  const [y, m, d] = String(e.detail.value).split('-').map((v) => Number(v))
  if (!y || !m || !d) return
  lastContactAt.value = new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

function clearContactDate() {
  lastContactAt.value = 0
}

function onCancel() {
  uni.navigateBack()
}

async function onSave() {
  const n = name.value.trim()
  if (!n) {
    uni.showToast({ title: '请填写客户名称', icon: 'none' })
    return
  }
  const payload: DataRow = {
    name: n,
    contact: contact.value.trim() || null,
    industry: industry.value.trim() || null,
    source: source.value.trim() || null,
    location: location.value.trim() || null,
    note: note.value.trim() || null,
    last_contact_at: lastContactAt.value
  }
  saving.value = true
  try {
    const ok = editId.value
      ? await data.updateCustomer(editId.value, payload)
      : await data.createCustomer(payload)
    // 保存成功回到列表（列表 onShow 会重新拉取，对齐 App 保存后 _load()）
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
  width: 200rpx;
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

.picker-box {
  flex: 1;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  font-size: 28rpx;
  color: #1f2430;

  &.is-placeholder {
    color: #b6bcc9;
  }
}

.chevron {
  font-size: 32rpx;
  color: #c4c9d4;
  margin-left: 12rpx;
}

.clear-btn {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #8a93a6;
  flex-shrink: 0;
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

.actions {
  display: flex;
  align-items: center;
  margin-top: 40rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin: 0;
}

.btn-ghost {
  background: rgba(74, 90, 240, 0.12);
  color: #4a5af0;
  margin-right: 20rpx;
}

.btn-primary {
  background: #4a5af0;
  color: #fff;
}

.btn-primary.is-disabled {
  opacity: 0.5;
}
</style>
