/**
 * 全局配置（9/15 备案通过后，只需改这里 + 微信后台合法域名）
 * @see DEV.md 部署说明
 */

// 开发期指向本地测试后端；9/15 后改为正式域名（如 https://api.example.com）
export const BASE_URL: string = 'http://127.0.0.1:8090'

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
