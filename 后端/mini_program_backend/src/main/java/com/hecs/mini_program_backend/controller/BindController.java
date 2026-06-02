package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Bind;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.BindService;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenParse;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bindings")
public class BindController {

    private final TokenParse tokenParse = new TokenParse();

    @Autowired
    private BindService bindService;

    @Autowired
    private UserService userService;

    @GetMapping("")
    public ResponseEntity<?> getBindings(@RequestHeader("Authorization") String token) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 根据用户类型获取绑定关系
            List<Bind> bindList = new ArrayList<>();
            if (user.getUserType() == 0) { // 老人
                bindList = bindService.getBindByElderId(user.getId());
            } else if (user.getUserType() == 1) { // 监护人
                bindList = bindService.getBindByGuardianId(user.getId());
            }
            
            // 处理绑定关系，添加用户名称
            List<Map<String, Object>> bindingsList = new ArrayList<>();
            for (Bind bind : bindList) {
                Map<String, Object> bindingMap = new HashMap<>();

                User partner;
                if (user.getUserType() == 0) { // Current user is an elder, partner is guardian
                    partner = userService.getUserById(bind.getGuardianId());
                } else { // Current user is a guardian, partner is elder
                    partner = userService.getUserById(bind.getElderId());
                }

                bindingMap.put("id", bind.getBindId());
                bindingMap.put("bind_status", bind.getBindStatus());

                if (partner != null) {
                    bindingMap.put("name", partner.getNickname());
                    bindingMap.put("phone", partner.getPhoneNumber());
                }
                
                boolean isActionable = bind.getBindStatus() == 0 && !bind.getInitiatorId().equals(user.getId());
                bindingMap.put("is_actionable", isActionable);
                
                bindingsList.add(bindingMap);
            }
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("data", bindingsList);
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取绑定关系失败: " + e.getMessage());
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createBinding(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body) {
        try {
            // 1. Parse token and get requester user
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            User requester = userService.getUserByOpenId(openId);
            if (requester == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }

            // 2. Get target_phone from body
            String targetPhone = body.get("target_phone");
            if (targetPhone == null || targetPhone.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "未提供目标用户手机号"));
            }

            // 3. Get target user
            User targetUser = userService.getUserByPhoneNumber(targetPhone);
            if (targetUser == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "目标用户不存在"));
            }

            // 4. Check for self-binding
            if (requester.getId().equals(targetUser.getId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "不能绑定自己"));
            }

            // 5. Check user types
            Integer requesterType = requester.getUserType();
            Integer targetUserType = targetUser.getUserType();

            if (requesterType.equals(targetUserType)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "监护人和老人不能是同一用户类型"));
            }

            Integer elderId;
            Integer guardianId;

            // userType 1 is guardian, 0 is elderly
            if (requesterType == 0 && targetUserType == 1) { // elderly -> guardian
                elderId = requester.getId();
                guardianId = targetUser.getId();
            } else if (requesterType == 1 && targetUserType == 0) { // guardian -> elderly
                elderId = targetUser.getId();
                guardianId = requester.getId();
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的用户类型组合"));
            }

            // 6. Check for existing bindings
            List<Bind> existingBinds = bindService.getBindingsByElderAndGuardianId(elderId, guardianId);
            if (existingBinds.stream().anyMatch(b -> b.getBindStatus() == 0 || b.getBindStatus() == 1)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "绑定关系已存在或正在等待确认"));
            }

            // 7. Create and save bind
            Bind bind = new Bind();
            bind.setGuardianId(guardianId);
            bind.setElderId(elderId);
            bind.setInitiatorId(requester.getId());
            bind.setBindStatus(0); // 0: pending approval

            Bind createdBind = bindService.createBind(bind);

            // 8. Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "绑定申请已发送");
            response.put("bindingId", createdBind.getBindId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "创建绑定关系失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateBindingStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id,
            @RequestBody Map<String, Integer> body) {
        try {
            // 1. Parse token and get current user
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }

            // 2. Get the binding
            Bind bind = bindService.getBindById(id);
            if (bind == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "绑定关系不存在"));
            }

            // 3. Get new status from body
            Integer newStatus = body.get("bind_status");
            if (newStatus == null || (newStatus != 1 && newStatus != 2)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的状态值"));
            }

            // 4. Authorization and state transition
            Integer currentStatus = bind.getBindStatus();
            String message;

            if (currentStatus == 0) { // Pending
                if (bind.getInitiatorId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "发起人不能批准自己的请求"));
                }
                if (!user.getId().equals(bind.getElderId()) && !user.getId().equals(bind.getGuardianId())) {
                     return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "无权更新此绑定关系"));
                }
                bind.setBindStatus(newStatus);
                message = newStatus == 1 ? "已接受绑定请求" : "已拒绝绑定请求";
            } else if (currentStatus == 1) { // Active
                if (newStatus != 2) { // Can only go from active to terminated
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的状态转换"));
                }
                if (!user.getId().equals(bind.getElderId()) && !user.getId().equals(bind.getGuardianId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "无权解除此绑定关系"));
                }
                bind.setBindStatus(newStatus);
                message = "已解除绑定关系";
            } else { // Already rejected or terminated
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "绑定关系已终结，无法更新"));
            }
            
            // 5. Save and return
            bindService.updateBind(bind);

            return ResponseEntity.ok(Map.of("success", true, "message", message));

        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "更新绑定状态失败: " + e.getMessage()));
        }
    }

    @PostMapping("/delete/{id}")
    public ResponseEntity<?> deleteBinding(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取绑定关系
            Bind bind = bindService.getBindById(id);
            if (bind == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("绑定关系不存在");
            }
            
            // 检查权限
            if (!bind.getElderId().equals(user.getId()) && !bind.getGuardianId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("无权解除此绑定关系");
            }
            
            // 删除绑定关系
            bindService.deleteBind(id);
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "解除绑定关系成功");
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("解除绑定关系失败: " + e.getMessage());
        }
    }
}
