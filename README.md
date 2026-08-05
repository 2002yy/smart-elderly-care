# Smart Elderly Care — 智慧养老微信小程序

> Java 17 + Spring Boot 3 + 原生微信小程序的多角色养老服务平台。

> **贡献说明**：本仓库为团队项目。本人主要负责后端开发、API 与数据库设计、权限和状态流转，以及前后端联调；并非唯一贡献者。

## 1. 项目定位

平台面向老人、监护人和服务人员，覆盖：

- 微信静默登录与 JWT 鉴权；
- 老人—监护人绑定；
- 服务创建、接单、进行、支付、评价；
- 紧急医疗信息和求助；
- 原生微信小程序页面与 Spring Boot REST API。

当前重点不是继续堆功能，而是建立可重复的构建、测试、启动和发布证据。

## 2. 技术栈

| 层级 | 技术 |
|---|---|
| 后端 | Java 17、Spring Boot 3.4.6、Spring Data JPA、Actuator |
| 数据库 | MySQL 8；测试使用 H2 MySQL 兼容模式 |
| 认证 | JJWT 0.11.5，HS256，密钥由 `JWT_SECRET` 注入 |
| 前端 | 原生微信小程序（JS / WXML / WXSS） |
| 构建 | Maven、Node.js 22 校验与小程序打包脚本 |
| 容器 | Docker Compose：MySQL + Spring Boot 后端 |
| CI | 后端 Maven Verify、前端结构/语法/打包、Compose 启动冒烟 |

## 3. 目录

```text
smart-elderly-care/
├─ 前端/miniprogram-1/miniprogram-1/   # 原生微信小程序
├─ 后端/mini_program_backend/           # Spring Boot 后端
├─ .github/workflows/                   # 自动化门禁
├─ .env.example                         # 无真实密钥的本地模板
└─ docker-compose.yml                   # MySQL + 后端
```

本批保留现有中文目录，避免同时破坏微信开发者工具导入路径、历史文档和 CI。后续若迁移为 `frontend/backend`，应单独提交并保留兼容说明。

## 4. 一键启动：Docker Compose

无需真实微信 AppID/Secret 即可启动数据库、后端和健康检查；只有真实 `wx.login` 才需要有效微信凭据。

```bash
git clone https://github.com/2002yy/smart-elderly-care.git
cd smart-elderly-care

cp .env.example .env
docker compose up -d --build

curl http://127.0.0.1:8081/actuator/health
```

预期返回：

```json
{"status":"UP"}
```

查看日志与停止：

```bash
docker compose logs -f backend
docker compose down --volumes
```

`.env` 已被忽略。生产环境必须替换：

- `MYSQL_ROOT_PASSWORD`
- `WECHAT_APPID`
- `WECHAT_APPSECRET`
- `JWT_SECRET`（至少 32 字符的独立随机值）

## 5. 非 Docker 后端启动

```bash
cd 后端/mini_program_backend
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties

export JWT_SECRET='replace-with-at-least-32-characters'
mvn spring-boot:run
```

本地模板中的微信值仅用于完成应用启动和健康检查，不会让真实微信登录成功。

## 6. 小程序校验与发布目录

小程序不依赖第三方前端框架。Node 脚本负责：

- 检查 `app.json`；
- 检查每个注册页面的 `.js/.json/.wxml/.wxss`；
- 校验全部 JSON 与 JavaScript 语法；
- 排除 `project.private.config.json`；
- 生成可导入的 `dist/` 和构建清单；
- 将 API 地址写入构建产物，而不是把公网地址硬编码进源码。

```bash
cd 前端/miniprogram-1/miniprogram-1
npm ci
npm run check

MINIPROGRAM_API_BASE_URL=https://api.example.com npm run build
```

随后在微信开发者工具中导入：

```text
前端/miniprogram-1/miniprogram-1/dist
```

源码开发默认 API 为 `http://127.0.0.1:8081`。

## 7. 核心服务状态

```text
0 未指派
1 待进行
2 进行中
3 待支付
4 待评价
5 已完成
```

关键权限合同包括：

- 非服务参与者不能取消或评价；
- 支付只能从状态 3 进入状态 4；
- 评价只能从状态 4 进入状态 5；
- 无效或过期 JWT 返回 401；
- 创建服务必须提供对象、类型、时间和地址。

## 8. 主要 API

| 模块 | 方法 | 路径 |
|---|---|---|
| 登录 | POST | `/login` |
| 注册 | POST | `/signup` |
| 服务列表 | GET | `/api/services` |
| 服务详情 | GET | `/api/services/{id}` |
| 创建服务 | POST | `/api/services/create` |
| 更新服务 | POST | `/api/services/update/{id}` |
| 取消服务 | POST | `/api/services/cancel/{id}` |
| 支付 | POST | `/api/services/payment/{id}` |
| 评价 | POST | `/api/services/evaluate/{id}` |
| 绑定 | GET/POST/PUT | `/api/bindings/**` |
| 紧急信息 | GET/POST | `/api/emergency/**` |

详细字段见前后端目录中的 `API_Documentation.md`。

## 9. 测试与 CI

### 后端门禁

```bash
cd 后端/mini_program_backend
mvn --batch-mode --no-transfer-progress clean verify
```

覆盖内容包括：

- Spring 上下文与 H2 数据库；
- JWT 无效请求；
- 服务取消、支付和评价权限；
- 服务状态合法流转；
- 真实 Controller → Service → Repository → H2 的创建与查询闭环；
- `/login` 缺少 code 时不调用微信外部接口。

### 全栈门禁

`Full Stack CI` 同时验证：

1. 原生小程序 `npm ci`、结构校验和发布目录构建；
2. Docker Compose 配置可解析；
3. MySQL 健康后启动后端；
4. `/actuator/health` 返回 `UP`；
5. `/login` 空请求保持 400 合同；
6. 失败时上传日志，结束时销毁容器与卷。

## 10. 安全与配置边界

- 不提交 `.env`、`application.properties` 或微信私有项目配置；
- 仓库只保留 `.env.example` 和 `application.properties.example`；
- JWT 签发与解析必须使用同一个环境密钥；
- 小程序源码不再包含固定公网服务器 IP；
- Compose 中的默认密码只用于本地开发，不可用于公网部署；
- 微信 AppSecret 不应出现在日志或客户端代码中。

## 11. 作品集价值

该项目用于展示：

- Spring Boot 分层与 JPA 持久化；
- 多角色权限和资源归属校验；
- 六状态业务流程；
- JWT 无状态认证；
- 原生微信小程序联调；
- H2 集成测试、Docker Compose 和 GitHub Actions；
- 从“课程项目可运行”到“工程交付可复核”的整改过程。

## 12. 待完成

- 真实微信测试账号端到端登录；
- 微信开发者工具自动化或人工真机验收记录；
- OpenAPI 文档；
- 生产数据库迁移工具；
- 正式演示视频与部署说明；
- 将 Controller 中残留的业务逻辑继续下沉到 Service 层。

## License

MIT License
