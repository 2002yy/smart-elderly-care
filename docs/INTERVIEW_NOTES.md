# Smart Elderly Care — Interview Notes

## 一句话介绍

基于 Spring Boot 3 + JPA + MySQL + JWT 的智慧养老微信小程序后端，实现老人/监护人/服务人员多角色的服务预约、状态流转、绑定关系和紧急救助。

## 多角色权限怎么设计的

5 种用户类型以 `user.user_type` 字段区分：

| 类型值 | 角色 | 核心能力 |
|--------|------|---------|
| 0 | 老人 | 享受服务、紧急呼救、评价 |
| 1 | 监护人 | 创建服务、绑定老人、支付 |
| 2/3/4 | 服务人员 | 接收任务、执行服务 |
| 99 | 未注册 | 仅可登录，需完善资料 |

**权限实现分两层：**

1. **前端控制** — 根据 `userType` 显示/隐藏功能按钮
2. **后端校验** — Controller 方法中判断 userId 与资源 owner 的匹配关系

面试追问：前端控制够不够？不够，后端必须校验。后续优化方向是统一拦截器 + 注解。

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

### 当前安全状态

- ✅ 算法 HS256，无算法混淆风险
- ✅ Payload 仅有 openid/user_type，无敏感信息
- ⚠️ 密钥硬编码（需移到配置文件）
- ⚠️ 无 token 撤销机制（短期 token + 刷新 token 可优化）

## 服务状态流转怎么保证合法

服务有 6 个状态：0(未指派) → 1(待进行) → 2(进行中) → 3(待支付) → 4(待评价) → 5(已完成)

**当前做法：** 关键操作（支付、评价）单独校验状态合法性。

**可改进方向：** 引入状态机模式，用 Map 定义合法转换规则，统一校验入口。

```java
Map<Integer, List<Integer>> validTransitions = Map.of(
    0, List.of(1),
    1, List.of(2),
    2, List.of(3),
    3, List.of(4),
    4, List.of(5)
);
```

## 数据库表怎么设计的

4 张表，多角色合一 user 表：

- **user 表**：多角色合一，避免角色分表后 JOIN 查询
- **service 表**：creator/target/provider 分别指向 user，status 控制生命周期
- **user_bind 表**：elder + guardian 双向绑定，initiator 权限溯源
- **emergency 表**：老人专属一对一紧急医疗信息

## 后续怎么补 Redis / Docker / 测试

### Redis 缓存
缓存用户信息、服务列表，减少 MySQL 查询。适用场景：用户信息缓存、服务列表缓存、绑定关系缓存。

### Docker Compose 完整编排
mysql + redis + backend 三容器一键启动。

### 测试覆盖规划
JUnit 5 → Service 层 / MockMvc → Controller 层 / Testcontainers → 集成测试 / GitHub Actions CI。

## 面试重点总结

| 维度 | 核心话术 |
|------|---------|
| 项目定位 | Java Spring Boot 多角色后端服务系统 |
| 架构 | Controller-Service-Repository 分层 |
| 认证 | 微信静默登录 + JWT 无状态 |
| 权限 | 前端控制 + 后端方法级校验 |
| 状态机 | 6 状态流转 + 合法性校验 |
| DB | 4 表，多角色合一 user 表 |
| 待补 | Redis 缓存 / 单元测试 / CI / Docker |
