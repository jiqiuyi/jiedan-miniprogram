# 接单管家小程序 MVP - 部署与配置说明

## 一、9/15 备案通过后需要改的配置项（必改清单）

| 序号 | 位置 | 现状 | 改成 |
|------|------|------|------|
| 1 | `src/utils/config.ts` 的 `BASE_URL` | `http://127.0.0.1:8090`（本地测试后端） | 正式域名，如 `https://api.你的域名.com` |
| 2 | 微信公众平台 → 开发管理 → 开发设置 → 服务器域名 | 未配置 | request 合法域名填入正式域名 |
| 3 | 微信开发者工具「详情 → 本地设置」 | 勾选「不校验合法域名」 | 正式发布前取消勾选 |
| 4 | `src/manifest.json` → `mp-weixin.appid` | 为空 | 填入小程序 AppID |

> 开发期后端不要求微信服务端官方校验 code，`/api/wechat/login` 是"手机号直接登录/注册"的简化实现（见下文）。若要接入官方 getPhoneNumber 解密，需增加 code 换 session_key 的服务端逻辑。

## 二、后端配套

- 需运行在后端 `server.dart` 上的能力：
  - `POST /api/wechat/login`：手机号登录/注册，返回 `{ ok, token, user }`（后端已实现 v1.30.0）
  - `GET /api/sync/pull?since=0`：全量拉取业务数据（已实现）
- 认证方式：`Authorization: Bearer <token>`
- 手机号是唯一键：App 与小程序同一手机号 = 同一 uid = 同一份数据

## 三、本地开发

```bash
npm install
npm run dev:mp-weixin   # 编译到 /dist/dev/mp-weixin，用微信开发者工具打开
npm run build:mp-weixin # 生产构建
```

1. 用微信开发者工具「导入项目」，选择 `dist/dev/mp-weixin`
2. 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
3. 本机需先启动后端 `server.dart`（8090 端口）

## 四、MVP 范围（只读）

- 手机号登录（getPhoneNumber 一键获取 / 开发期手动输入）
- 报价列表 + 详情（只读）
- 报价分享（onShareAppMessage，客户打开只读详情页）
- 客户 / 项目 列表 + 详情（只读）

明确不做：新建/编辑报价、收款（ZPAY 联调）、离线存储、扫码监听、本地通知。

## 五、结构分层约束

```
src/
├── pages/    # 页面：只渲染 + 调 store/api，禁止直接请求
├── api/      # 接口封装：只发请求 + 参数校验，禁止操作状态
├── store/    # Pinia 状态：token / 用户 / 同步数据
├── utils/    # 纯函数：config / request / format / storage
└── components/ # 公共组件（MVP 暂空）
```

- 页面层禁止直接 `uni.request`，必须走 `api/` 层
- `api/` 按模块分文件，不堆大文件
- 工程与 App（`D:\dev\jiedan_app`）完全隔离，零文件共享零交叉引用
