<template>
  <view class="page">
    <view class="card">
      <view class="cell">
        <text class="label">客户名称</text>
        <input v-model="name" class="field" placeholder="必填" />
      </view>
      <view class="cell">
        <text class="label">联系人</text>
        <input v-model="contact" class="field" placeholder="姓名 / 称呼" />
      </view>
      <view class="cell">
        <text class="label">行业</text>
        <input v-model="industry" class="field" placeholder="如：电商 / 餐饮" />
      </view>
      <view class="cell">
        <text class="label">来源</text>
        <input v-model="source" class="field" placeholder="如：朋友介绍 / 线上" />
      </view>
      <view class="cell">
        <text class="label">所在地区</text>
        <input v-model="location" class="field" placeholder="城市 / 区域" />
      </view>
      <view class="cell col">
        <text class="label">备注</text>
        <textarea v-model="note" class="textarea" placeholder="补充说明（选填）" :maxlength="500" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @tap="onSave">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
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
const saving = ref(false)

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  if (!query?.id) return
  editId.value = Number(query.id)
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
})

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
    note: note.value.trim() || null
  }
  saving.value = true
  try {
    const ok = editId.value
      ? await data.updateCustomer(editId.value, payload)
      : await data.createCustomer(payload)
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

.save-btn {
  margin-top: 40rpx;
  background: #4a5af0;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
