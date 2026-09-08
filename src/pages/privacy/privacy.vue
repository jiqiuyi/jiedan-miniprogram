<template>
  <view class="page">
    <view class="doc">
      <view class="sec">
        <view class="sec-title">一、我们收集哪些信息</view>
        <view class="para">
          1. 账号信息：您通过微信授权登录本小程序时，我们会在您同意后获取微信提供的手机号与昵称，用于创建您的专属账号并标识您的数据归属；您也可以自行修改昵称。
        </view>
        <view class="para">
          2. 设备与运行信息：为实现功能与保障安全所必需的基础信息（如操作系统与小程序版本、网络状态等），仅用于兼容性判断与问题排查。我们不采集您的位置、通讯录、相册内容、通话记录等与功能无关的信息。
        </view>
        <view class="para">
          3. 业务数据：您在小程序中主动录入的客户、项目、收款记录、报价单、待收款、里程碑、合同等资料。这些数据属于您自己，保存在您本人的账号空间中。
        </view>
        <view class="para">
          4. 订阅与消费信息：专业版订阅状态（是否开通及到期时间）、开通与支付相关信息、推广活动（邀请关系、返现）等，用于为您提供对应权益。
        </view>
        <view class="para">
          5. 意见反馈信息：您通过「意见反馈」提交的内容与联系方式（选填），用于处理与回复您的问题或建议。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">二、业务数据的存储方式</view>
        <view class="para">
          本小程序为云端账号形态：您的业务数据以您本人账号（微信登录手机号对应的账号命名空间）为准，保存在我们提供的服务器上；同一账号在任何设备登录均可恢复，无需手动迁移。
        </view>
        <view class="para">
          小程序端仅保存少量缓存数据用于提升打开与浏览速度，这些缓存仅服务于您的当前设备体验，核心数据以云端为准。您随时可以退出登录或清理小程序缓存，云端数据不会因此丢失；再次登录同一账号即可继续使用。
        </view>
        <view class="para">
          不同账号之间的云端数据相互隔离，我们仅按您的账号代为存储，绝不挪作他用，也不会在其他账号下展示您的数据。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">三、信息如何使用</view>
        <view class="para">
          我们仅将收集的信息用于：① 为您提供客户管理、项目管理、报价、收款、合同管理等核心功能；② 账号登录与订阅权益校验；③ 处理您提交的意见反馈；④ 保障账号与数据安全（防破解、防冒用）；⑤ 在您授权范围内发送功能与订阅相关通知。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">四、权限使用说明</view>
        <view class="para">
          1. 手机号授权：由微信在您点击授权时弹出确认，我们仅在您同意后获取，用于注册或登录账号。
        </view>
        <view class="para">
          2. 剪贴板：仅当您主动点击「复制」时，用于把文本复制到剪贴板，方便您粘贴保存。
        </view>
        <view class="para">
          3. 其它说明：本小程序不申请也无法使用您的位置、相机、麦克风、通讯录等与经营记账无关的权限；小程序内出现的任何系统授权均需您主动确认。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">五、是否与第三方共享</view>
        <view class="para">
          我们不与任何广告商共享、出售或出租您的个人信息，小程序中不含第三方广告组件采集您的行为数据。
        </view>
        <view class="para">
          仅以下场景会发生必要的第三方交互，且均由相应平台按其自身规则与隐私政策处理：① 微信平台——账号登录由微信授权体系完成，相关处理遵循微信的隐私规则；② 支付——开通专业版付款时，根据您选择的支付方式会跳转到微信支付或支付宝的官方支付页面完成付款，我们不保存您的支付密码、银行卡号等信息。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">六、数据安全措施</view>
        <view class="para">
          1. 传输安全：客户端与服务器通信采用登录态鉴权，云端接口全部校验登录身份；正式部署后启用加密传输并对服务器进行校验（防伪造服务器）。
        </view>
        <view class="para">
          2. 存储安全：账号数据按用户命名空间强制隔离，不同账号互不可见；云端对关键数据做加密存储与访问控制。
        </view>
        <view class="para">
          3. 使用安全：请勿向他人泄露您的账号信息或授权他人使用您的微信账号；在公共设备上使用后请及时退出登录。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">七、数据保留与删除</view>
        <view class="para">
          1. 云端数据：您的业务数据保存在本人账号的服务器空间中。您可随时在小程序内查看、修改或删除业务数据；删除客户或项目时，其关联的收款记录将一并删除。
        </view>
        <view class="para">
          2. 缓存数据：清理微信小程序缓存或退出登录只会清除本机缓存，不影响云端数据；重新登录同一账号即可恢复。
        </view>
        <view class="para">
          3. 账号注销：如需注销云端账号或删除全部云端数据，请通过「意见反馈」联系我们，我们将在核实身份后协助处理。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">八、您的权利</view>
        <view class="para">
          1. 导出：您可通过「我的 → 数据导出」查看并复制本人账号下的全部业务数据，随时带走。
        </view>
        <view class="para">
          2. 删除：您可随时删除任意客户、项目、收款等数据，也可按第七节所述申请删除账号下全部云端数据。
        </view>
        <view class="para">
          3. 查询与更正：您可在小程序内随时查看和修改自己的信息；如对个人信息处理有任何疑问，可通过「意见反馈」联系我们。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">九、未成年人条款</view>
        <view class="para">
          本小程序面向成年人（年满 18 周岁）的经营与记账场景。若您为未成年人，请在监护人指导下使用，并应事先取得监护人的同意；我们不为未成年人提供超出其年龄与智力范围的功能。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">十、隐私政策的更新与生效</view>
        <view class="para">
          我们可能会适时更新本隐私政策，重大变更将通过小程序内公告或站内消息告知。政策更新后，您继续使用即视为您已阅读并接受更新后的内容。
        </view>
      </view>

      <view class="sec">
        <view class="sec-title">十一、联系我们</view>
        <view class="para">
          如您对本隐私政策、数据存储或个人信息处理有任何疑问、意见或诉求，可通过以下任一方式联系我们：
        </view>
        <view class="para">
          1. 在线反馈（最快送达）：小程序内「我的 → 意见反馈」在线提交；如方便，可在反馈时留下您的联系方式，我们会优先通过该方式回复您。
        </view>
        <view class="para">
          2. 电子邮箱：您可以发送邮件至 qhw19980901@gmail.com，我们会在收到后的合理时间内回复您。
        </view>
      </view>

      <text class="doc-foot">生效日期：2026-09-02 · 最近更新：2026-09-08（小程序版）</text>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.page {
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.doc {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.sec {
  margin-bottom: 26rpx;
}

.sec-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
  margin-bottom: 12rpx;
}

.para {
  font-size: 26rpx;
  line-height: 1.7;
  color: #3a4150;
  margin-bottom: 10rpx;
  text-align: justify;
  word-break: break-all;
}

.doc-foot {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #b6bcc9;
}
</style>
