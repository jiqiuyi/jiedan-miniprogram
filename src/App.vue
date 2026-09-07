<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

onLaunch(() => {
  // 启动时恢复本地登录态
  const store = useUserStore()
  store.restore()
})
</script>

<style lang="scss">
page {
  background-color: #f5f6fa;
  font-size: 28rpx;
  color: #1f2430;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

view,
text,
button,
input,
image {
  box-sizing: border-box;
}
</style>
