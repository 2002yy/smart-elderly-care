# 小程序接口文档

本文档描述了小程序前端所需的所有后端API接口。

## 目录

1. [用户认证](#用户认证)
2. [用户信息](#用户信息)
3. [服务管理](#服务管理)
4. [紧急救助](#紧急救助)
5. [绑定关系](#绑定关系)

## 用户认证

### 微信登录

**接口地址**: `/login`

**请求方式**: `POST`

**请求参数**:

| 参数名 | 类型   | 必填 | 描述                 |
| ------ | ------ | ---- | -------------------- |
| code   | string | 是   | 微信登录临时凭证code |

**响应参数**:

| 参数名        | 类型   | 描述         |
| ------------- | ------ | ------------ |
| token         | string | 用户登录令牌 |
| userInfo      | object | 用户信息     |
| serviceInfo   | array  | 服务信息列表 |
| emergencyInfo | object | 紧急医疗信息 |
| bindInfo      | array  | 绑定关系列表 |

**userInfo对象结构**:

| 参数名      | 类型   | 描述                                              |
| ----------- | ------ | ------------------------------------------------- |
| id          | string | 用户ID                                            |
| userType    | number | 用户类型(0:老人, 1:监护人, 2:服务人员, 99:未注册) |
| nickname    | string | 用户昵称                                          |
| phoneNumber | string | 手机号                                            |
| gender      | number | 性别(0:未知, 1:男, 2:女)                          |
| region      | array  | 地区信息                                          |
| address     | string | 详细地址                                          |
| age         | number | 年龄                                              |


**响应示例**{

"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
"userInfo": {
"id": "user123",
"userType": 0,
"nickname": "张三",
"phoneNumber": "13800138000",
"gender": 1,
"region": ["广东省", "深圳市", "南山区"],
"address": "科技园路1号",
"age": 70
},
"serviceInfo": [...],
"emergencyInfo": {...},
"bindInfo": [...]
}



### 用户注册

**接口地址**: `/signup`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**:

| 参数名      | 类型   | 必填 | 描述                                   |
| ----------- | ------ | ---- | -------------------------------------- |
| userType    | number | 是   | 用户类型(0:老人, 1:监护人, 2:服务人员) |
| nickname    | string | 是   | 用户昵称                               |
| phoneNumber | string | 是   | 手机号                                 |
| gender      | number | 是   | 性别(0:未知, 1:男, 2:女)               |
| region      | array  | 是   | 地区信息                               |
| address     | string | 是   | 详细地址                               |
| age         | number | 否   | 年龄                                   |
|             |        |      |                                        |

**响应参数**:

| 参数名   | 类型    | 描述     |
| -------- | ------- | -------- |
| success  | boolean | 是否成功 |
| message  | string  | 提示信息 |
| userInfo | object  | 用户信息 |

## 用户信息

### 获取用户信息

**接口地址**: `/api/user/info`

**请求方式**: `GET`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**响应参数**:

| 参数名   | 类型   | 描述     |
| -------- | ------ | -------- |
| userInfo | object | 用户信息 |

### 更新用户信息

**接口地址**: `/api/user/update`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**: 与用户信息对象相同

**响应参数**:

| 参数名   | 类型    | 描述             |
| -------- | ------- | ---------------- |
| success  | boolean | 是否成功         |
| message  | string  | 提示信息         |
| userInfo | object  | 更新后的用户信息 |

## 服务管理

### 获取服务列表

**接口地址**: `/api/services`

**请求方式**: `GET`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**:

| 参数名   | 类型   | 必填 | 描述               |
| -------- | ------ | ---- | ------------------ |
| page     | number | 否   | 页码，默认为1      |
| pageSize | number | 否   | 每页数量，默认 10，范围 1—100 |
| status   | number | 否   | 按状态分页筛选（1 同时包含未指派 0 与待进行 1；其他值 0—5 精确匹配） |

**响应参数**:

| 参数名   | 类型   | 描述     |
| -------- | ------ | -------- |
| data     | array  | 服务列表 |
| total    | number | 总数量   |
| page     | number | 当前页码 |
| pageSize | number | 每页数量 |

**服务对象结构**:

| 参数名           | 类型   | 描述                                                     |
| ---------------- | ------ | -------------------------------------------------------- |
| id               | string | 服务ID                                                   |
| type             | string | 服务类型('生活照料', '医疗护理', '心理护理')             |
| status           | number | 服务状态（0 未指派、1 待进行、2 进行中、3 待支付、4 待评价、5 已完成） |
| creatorId        | string | 创建者ID                                                 |
| creatorName      | string | 创建者姓名                                               |
| targetId         | string | 服务对象ID                                               |
| targetName       | string | 服务对象姓名                                             |
| providerId       | number | 服务提供者ID；0 表示未派单                           |
| providerName     | string | 服务提供者姓名                                           |
| scheduledTime    | string | 预约时间                                                 |
| appointedAddress | string | 服务地址                                                 |
| remark           | string | 备注                                                     |
| createTime       | string | 创建时间                                                 |
| updateTime       | string | 更新时间                                                 |

备注：`providerId=0` 表示尚未指派服务人员，不代表某个真实用户；新建预约时客户端不能指定 `providerId`。
当前服务端尚无真实派单/接单入口，状态为 0 的订单不应展示为已接单。

此外，targetName和providerName需要通过各自的id查找user表获得

### 获取服务详情

**接口地址**: `/api/services/{id}`

**请求方式**: `GET`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 服务ID |

**响应参数**:

| 参数名  | 类型   | 描述     |
| ------- | ------ | -------- |
| service | object | 服务详情 |

### 创建服务

**接口地址**: `/api/services/create`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**:

| 参数名        | 类型   | 必填 | 描述                                         |
| ------------- | ------ | ---- | -------------------------------------------- |
| type          | number | 是   | 服务类型编号（0 生活照料、1 医疗护理、2 心理护理） |
| targetId      | number | 是   | 服务对象用户 ID（须为本人或已确认绑定的老人） |
| scheduledTime | string | 是   | 预约时间                                     |
| address       | string | 是   | 服务地址                                     |
| remark        | string | 否   | 备注                                         |

**响应参数**:

| 参数名    | 类型    | 描述         |
| --------- | ------- | ------------ |
| success   | boolean | 是否成功     |
| message   | string  | 提示信息     |
| service   | object  | 创建的服务详情（含 serviceId，providerId=0） |

### 更新服务

**接口地址**: `/api/services/update/{id}`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 服务ID |

**请求参数**: 与创建服务相同

**响应参数**:

| 参数名  | 类型    | 描述         |
| ------- | ------- | ------------ |
| success | boolean | 是否成功     |
| message | string  | 提示信息     |
| service | object  | 更新后的服务 |

### 取消服务

只有创建者或服务对象能够取消尚未开始的订单（状态 0/1）；状态 2—5 的订单不能通过该接口删除，返回 HTTP 409。

**接口地址**: `/api/services/cancel/{id}`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 服务ID |

**响应参数**:

| 参数名  | 类型    | 描述     |
| ------- | ------- | -------- |
| success | boolean | 是否成功 |
| message | string  | 提示信息 |

### 服务评价

**接口地址**: `/api/services/evaluate/{id}`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 服务ID |

**请求参数**:

| 参数名  | 类型   | 必填 | 描述      |
| ------- | ------ | ---- | --------- |
| rating  | number | 是   | 评分(1-5) |
| comment | string | 否   | 评价内容  |

**响应参数**:

| 参数名  | 类型    | 描述     |
| ------- | ------- | -------- |
| success | boolean | 是否成功 |
| message | string  | 提示信息 |

## 紧急救助

### 获取紧急医疗信息

**接口地址**: `/api/emergency/info`

**请求方式**: `GET`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**响应参数**:

| 参数名        | 类型   | 描述         |
| ------------- | ------ | ------------ |
| emergencyInfo | object | 紧急医疗信息 |

**emergencyInfo对象结构**:

| 参数名         | 类型   | 描述         |
| -------------- | ------ | ------------ |
| bloodType      | string | 血型         |
| allergies      | string | 过敏史       |
| basicDiseases  | string | 基础疾病     |
| surgeryHistory | string | 手术史       |
| medication     | string | 当前用药情况 |
| emergencyNotes | string | 紧急备注     |

### 更新紧急医疗信息

**接口地址**: `/api/emergency/update`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**: 与emergencyInfo对象结构相同

**响应参数**:

| 参数名        | 类型    | 描述             |
| ------------- | ------- | ---------------- |
| success       | boolean | 是否成功         |
| message       | string  | 提示信息         |
| emergencyInfo | object  | 更新后的紧急信息 |

### 紧急求助通知（尚未实现）

**接口地址**: `/api/emergency/help`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**当前行为**：服务端尚未接入监护人或救援机构的实际通知渠道。认证成功后返回
HTTP `501 Not Implemented`，`success: false`、`delivered: false` 和提示消息，
**不会生成求助单号，也不会发送求助**。旧客户端仍可调用此路径，但不能把返回值视为送达证据。

小程序急救卡目前仅提供中国大陆 120 和监护人的直接拨号入口，呼叫是否接通需由用户确认。

## 绑定关系

### 获取绑定列表

**接口地址**: `/api/bindings`

**请求方式**: `GET`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**响应参数**:

| 参数名   | 类型  | 描述         |
| -------- | ----- | ------------ |
| bindings | array | 绑定关系列表 |

**绑定关系对象结构**:

| 参数名       | 类型   | 描述                                   |
| ------------ | ------ | -------------------------------------- |
| id           | string | 绑定ID                                 |
| status       | number | 绑定状态(1:待确认, 2:已接受, 3:已拒绝) |
| elderId      | string | 被绑定人ID(老人)                       |
| elderName    | string | 被绑定人姓名                           |
|              |        |                                        |
| guardianId   | string | 监护人ID                               |
| guardianName | string | 监护人姓名                             |
|              |        |                                        |
| createTime   | string | 创建时间                               |
| updateTime   | string | 更新时间                               |

备注：elderName和guardianName需要根据各自的ID信息获取

### 创建绑定关系

**接口地址**: `/api/bindings/create`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**请求参数**:

| 参数名       | 类型   | 必填 | 描述                  |
| ------------ | ------ | ---- | --------------------- |
| targetId     | string | 是   | 被绑定人ID(老人)      |
| targetType   | number | 是   | 被绑定人类型(通常为0) |
| guardianId   | string | 是   | 监护人ID              |
| guardianType | number | 是   | 监护人类型(通常为1)   |

**响应参数**:

| 参数名    | 类型    | 描述         |
| --------- | ------- | ------------ |
| success   | boolean | 是否成功     |
| message   | string  | 提示信息     |
| bindingId | string  | 创建的绑定ID |

### 更新绑定状态

**接口地址**: `/api/bindings/update/{id}`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 绑定ID |

**请求参数**:

| 参数名 | 类型   | 必填 | 描述                     |
| ------ | ------ | ---- | ------------------------ |
| status | number | 是   | 绑定状态(2:接受, 3:拒绝) |

**响应参数**:

| 参数名  | 类型    | 描述     |
| ------- | ------- | -------- |
| success | boolean | 是否成功 |
| message | string  | 提示信息 |

### 解除绑定关系

**接口地址**: `/api/bindings/delete/{id}`

**请求方式**: `POST`

**请求头**:

| 参数名        | 类型   | 必填 | 描述     |
| ------------- | ------ | ---- | -------- |
| Authorization | string | 是   | 登录令牌 |

**路径参数**:

| 参数名 | 类型   | 必填 | 描述   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 绑定ID |

**响应参数**:

| 参数名            | 类型    | 描述     |
| ----------------- | ------- | -------- |
| success           | boolean | 是否成功 |
| message           | string  | 提示信息 |
| </rewritten_file> |         |          |
