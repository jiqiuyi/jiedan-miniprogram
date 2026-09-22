/**
 * 全局配置（正式发布版：统一指向线上正式域名）
 * @see DEV.md 部署说明
 */

// 正式环境后端地址（与接单管家 App 同一后端账号体系，账号完全互通）
export const BASE_URL: string = 'https://yurouyun.cn'

// 登录态存储 key
export const TOKEN_KEY = 'jiedan_token'
export const USER_KEY = 'jiedan_user'

// 同步拉取的缓存 key
export const SYNC_CACHE_KEY = 'jiedan_sync_cache'

// 钱包账本（充值 / 提现 / 提现账户，本地 MVP 记录）
export const WALLET_RECHARGE_KEY = 'jiedan_wallet_recharges'
export const WALLET_WITHDRAW_KEY = 'jiedan_wallet_withdrawals'
export const WALLET_ACCOUNT_KEY = 'jiedan_wallet_account'

// 收款码本地图片路径（微信 / 支付宝；云端存储后续接入）
export const PAYCODE_WX_KEY = 'jiedan_paycode_wx'
export const PAYCODE_ALI_KEY = 'jiedan_paycode_ali'

// 客户标签（tags / customer_tags，对齐 App 标签系统；标签为本机语义数据）
export const TAGS_KEY = 'jiedan_tags'

// 免费版额度（对齐 App AppConfig，达到上限后触发专业版引导）
export const FREE_CUSTOMER_LIMIT = 1
export const FREE_PROJECT_LIMIT = 3

// 「我的」页本机偏好（对齐 App AvatarService / DeviceInfoReporter 的本机存储语义）
// - 自定义头像：仅保存在本机，不上传；登出不清除
export const AVATAR_LOCAL_KEY = 'jiedan_avatar_local'
// - 反馈信息上报开关：默认开启，关闭后提交反馈不再附带设备信息
export const FEEDBACK_REPORT_KEY = 'jiedan_feedback_report'

// 本机反馈箱（本地留档 + 与服务器列表合并，对齐 App feedbacks 表语义；登出不清除）
export const LOCAL_FEEDBACK_KEY = 'jiedan_local_feedbacks'

// 客户端版本号（对齐 src/manifest.json versionName / versionCode）
export const CLIENT_VERSION = '0.1.0'
export const CLIENT_BUILD = '100'

// 隐私政策页脚展示的版本号（取 App 正本 AppConfig.version 的值）
export const POLICY_VERSION = '1.43.1+56'
