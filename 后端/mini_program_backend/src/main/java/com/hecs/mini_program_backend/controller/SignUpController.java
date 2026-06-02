package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenParse;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class SignUpController {

    private final TokenParse tokenParse = new TokenParse();

    @Autowired
    private UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<?> signUpController(@RequestHeader("Authorization") String token, @RequestBody Map<String, Object> body) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 检查是否是注销请求
            if (body.containsKey("action") && "deregister".equals(body.get("action"))) {
                // 注销用户 - 保留id和openId，重置其他字段
                user.setUserType(99); // 重置为未注册状态
                user.setNickname(null);
                user.setPhoneNumber(null);
                user.setGender(null);
                user.setRegion(null);
                user.setAddress(null);
                user.setAge(null);
                
                User updatedUser = userService.updateUser(user);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "注销成功");
                
                return ResponseEntity.ok(response);
            } else {
                // 正常更新用户信息
                user.setUserType(Integer.parseInt(body.get("userType").toString()));
                user.setNickname(body.get("nickname").toString());
                user.setPhoneNumber(body.get("phoneNumber").toString());
                user.setGender(body.get("gender").toString());
                user.setRegion(body.get("region").toString());
                user.setAddress(body.get("address").toString());
                if (body.containsKey("age")) {
                    user.setAge(Integer.parseInt(body.get("age").toString()));
                }
                
                // 保存用户信息
                User updatedUser = userService.updateUser(user);
                
                // 返回结果
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "注册成功");
                response.put("userInfo", updatedUser);
                
                return ResponseEntity.ok(response);
            }
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("操作失败: " + e.getMessage());
        }
    }
}
