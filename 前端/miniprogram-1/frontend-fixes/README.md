# 微信小程序登录修复指南

## 问题描述

小程序登录时出现 500 错误，显示"微信API返回错误"。

## 解决方案

主要问题是小程序前端使用了 `http://localhost:8081/login` 作为登录 API 地址，这在小程序环境中是不可访问的。需要使用正确的服务器地址。

## 修复步骤

1. **添加配置文件**

   将 `config.js` 文件复制到小程序项目的根目录，并根据实际情况修改 `baseUrl`：

   ```javascript
   // 修改为您的实际服务器地址
   baseUrl: 'https://47.109.145.84:8081',
   ```

2. **修改 app.js**

   更新 `app.js` 文件，引入配置并设置全局数据：

   ```javascript
   const config = require('./config');
   
   App({
     // ... 其他代码 ...
     
     globalData: {
       userInfo: null,
       baseUrl: config.baseUrl
     }
   });
   ```

3. **更新 login.js**

   使用提供的 `login.js` 文件替换原有的登录页面代码，或者修改现有代码：

   ```javascript
   // 将固定URL
   url: 'http://localhost:8081/login'
   
   // 修改为使用配置
   url: `${config.baseUrl}${config.apis.login}`
   ```

## 其他改进

1. 添加了更好的错误处理
2. 添加了网络状态检测
3. 确保存储的数据格式正确
4. 添加了更详细的日志记录

## 注意事项

1. 确保服务器已开启 HTTPS（微信小程序要求）
2. 确保服务器已添加到小程序的安全域名列表中
3. 检查服务器防火墙是否允许来自外部的连接
4. 后端已添加 CORS 支持，允许小程序访问 