# Smart Elderly Care — Interview Notes

## 一句话介绍

基于 Spring Boot 3 + JPA + MySQL + JWT 的智慧养老微信小程序后端，实现老人/监护人/服务人员多角色的服务预约、状态流转、绑定关系和紧急救助。

## JWT 登录链路

```
① 小程序 wx.login() → 获取 code（5 分钟有效）
② 前端 POST /login { code } → 后端
③ 后端调微信 API: jscode2session（appid + secret + code）
④ 微信返回 { openid, session_key }
⑤ 后端查/建 User 记录
⑥ 后端生成 JWT（含 openid, user_type），1 小时过期
⑦ 返回前端 { token, userInfo, serviceInfo, bindInfo }
⑧ 前端存 wx.setStorageSync('token')
⑨ 后续请求 header: Authorization: Bearer <token>
```

当前安全状态：HS256 算法无误，Payload 仅有 openid/user_type。密钥硬编码需改进，无 token 撤销机制待补。

## 老人/监护人/服务人员多角色权限

5 种用户类型以 `user.user_type` 字段区分：

| 值 | 角色 | 核心能力 |
|----|------|---------|
| 0 | 老人 | 享受服务、紧急呼救、评价 |
| 1 | 监护人 | 创建服务、绑定老人、支付 |
| 2/3/4 | 服务人员 | 接收任务、执行服务 |

权限分两层：前端根据 userType 控制功能入口显示；后端 Controller 方法中校验 userId 与资源 owner 的匹配关系。后续优化方向为统一拦截器 + `@RequireRole` 注解。

## 服务状态机：创建→指派→开始→完成→支付→评价

6 个状态，严格顺序流转：

```
创建(0:未指派) → 指派(1:待进行) → 开始(2:进行中)
→ 完成(3:待支付) → 支付(4:待评价) → 评价(5:已完成)
```

关键操作单独做状态合法性校验（如支付只允许 status=3 → 4），后续可引入状态机模式统一管理。

## 数据库四张核心表设计

| 表 | 说明 |
|----|------|
| `user` | 多角色合一（user_type 区分），避免三张角色表 JOIN |
| `service` | 服务订单，creator/target/provider 指向 user，status 控制生命周期 |
| `user_bind` | 老人-监护人双向绑定，initiator 记录发起方用于权限校验 |
| `emergency` | 老人专属一对一紧急医疗信息 |

多角色合一设计的核心考量：角色间有大量公共字段（昵称、手机号、地址），分表会导致重复定义和跨角色 JOIN 查询，合一后用 user_type 区分，查询简单。

## 为什么用 JPA

项目初期表结构简单（4 张表），关联不复杂，用 JPA 的 `ddl-auto=update` 可以快速迭代，无需手写建表 SQL。方法名派生查询（`findByCreatorIdOrTargetId`）覆盖了大部分查询场景，开发效率高。如果后续查询复杂度上升，计划引入 MyBatis-Plus 做互补——简单 CRUD 用 JPA，复杂查询用 MyBatis。

## 后续如何补 Redis、OpenAPI、JUnit/MockMvc、GitHub Actions

| 方向 | 优先级 | 方案 |
|------|--------|------|
| JUnit / MockMvc 最小测试 | P0 | Service 层 + Controller 层核心流程 |
| OpenAPI 接口文档 | P1 | SpringDoc + Swagger UI，自动生成 |
| Redis 缓存验证码/登录态辅助/热点服务 | P1 | 用户信息缓存 + 登录辅助 + 高频读取 |
| Docker Compose 完整后端 + MySQL | P2 | Spring Boot JAR + MySQL 一键编排 |
| GitHub Actions CI | P1 | push 时自动 mvn verify + lint |

### 面试重点总结

| 维度 | 核心话术 |
|------|---------|
| 项目定位 | Java Spring Boot 多角色后端系统 |
| 架构 | Controller-Service-Repository 分层 |
| 认证 | 微信静默登录 + JWT 无状态 |
| 权限 | 2 层：前端控制 + 后端方法级校验 |
| 状态机 | 6 状态严格流转 + 合法性校验 |
| DB 设计 | 4 表，多角色合一 user 表 |
| ORM 选型 | JPA 主 + MyBatis-Plus 辅（规划中） |
| 后续 | JUnit/MockMvc → OpenAPI → Redis → Docker → CI |
