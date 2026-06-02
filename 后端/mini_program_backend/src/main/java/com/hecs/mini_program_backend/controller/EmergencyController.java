package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Emergency;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.EmergencyService;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenParse;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final TokenParse tokenParse = new TokenParse();

    @Autowired
    private EmergencyService emergencyService;

    @Autowired
    private UserService userService;

    @GetMapping("/info")
    public ResponseEntity<?> getEmergencyInfo(@RequestHeader("Authorization") String token) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取紧急医疗信息
            List<Emergency> emergencyList = emergencyService.getEmergencyByUserId(user.getId());
            Emergency emergencyInfo;
            
            if (emergencyList.isEmpty()) {
                // 如果不存在，创建一个新的
                emergencyInfo = new Emergency();
                emergencyInfo.setUserId(user.getId());
                emergencyInfo = emergencyService.createEmergency(emergencyInfo);
            } else {
                // 如果存在，返回第一个
                emergencyInfo = emergencyList.get(0);
            }
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("emergencyInfo", emergencyInfo);
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取紧急医疗信息失败: " + e.getMessage());
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateEmergencyInfo(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取紧急医疗信息
            List<Emergency> emergencyList = emergencyService.getEmergencyByUserId(user.getId());
            Emergency emergencyInfo;
            
            if (emergencyList.isEmpty()) {
                // 如果不存在，创建一个新的
                emergencyInfo = new Emergency();
                emergencyInfo.setUserId(user.getId());
            } else {
                // 如果存在，更新第一个
                emergencyInfo = emergencyList.get(0);
            }
            
            // 更新信息
            if (body.containsKey("bloodType")) {
                emergencyInfo.setBloodType(body.get("bloodType").toString());
            }
            if (body.containsKey("allergies")) {
                emergencyInfo.setAllergies(body.get("allergies").toString());
            }
            if (body.containsKey("basicDiseases")) {
                emergencyInfo.setBasicDiseases(body.get("basicDiseases").toString());
            }
            if (body.containsKey("surgeryHistory")) {
                emergencyInfo.setSurgeryHistory(body.get("surgeryHistory").toString());
            }
            if (body.containsKey("medication")) {
                emergencyInfo.setMedication(body.get("medication").toString());
            }
            if (body.containsKey("emergencyNotes")) {
                emergencyInfo.setEmergencyNotes(body.get("emergencyNotes").toString());
            }
            
            // 保存更新
            Emergency updatedEmergency = emergencyService.updateEmergency(emergencyInfo);
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "更新紧急医疗信息成功");
            response.put("emergencyInfo", updatedEmergency);
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("更新紧急医疗信息失败: " + e.getMessage());
        }
    }

    @PostMapping("/help")
    public ResponseEntity<?> sendEmergencyHelp(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {
        try {
            // 解析token
            tokenParse.parseToken(token.replace("Bearer ", ""));
            String openId = tokenParse.getOpenid();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取位置信息
            Map<String, Object> location = (Map<String, Object>) body.get("location");
            if (location == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("位置信息不能为空");
            }
            
            // 获取紧急消息
            String message = body.containsKey("message") ? body.get("message").toString() : "";
            
            // TODO: 实际应用中，这里应该发送紧急求助信息到相关服务或者通知监护人
            // 这里只是模拟返回一个求助ID
            String helpId = UUID.randomUUID().toString();
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "发送紧急求助成功");
            response.put("helpId", helpId);
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("发送紧急求助失败: " + e.getMessage());
        }
    }
}
