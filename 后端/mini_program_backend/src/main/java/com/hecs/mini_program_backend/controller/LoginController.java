package com.hecs.mini_program_backend.controller;

import cn.hutool.http.HttpUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hecs.mini_program_backend.config.WeChatConfig;
import com.hecs.mini_program_backend.entity.Bind;
import com.hecs.mini_program_backend.entity.Emergency;
import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.BindService;
import com.hecs.mini_program_backend.service.EmergencyService;
import com.hecs.mini_program_backend.service.ServiceService;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenGenerate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class LoginController {
    private static final Logger logger = LoggerFactory.getLogger(LoginController.class);

    @Autowired
    private WeChatConfig weChatConfig;

    @Autowired
    private UserService userService;

    @Autowired
    private ServiceService serviceService;

    @Autowired
    private BindService bindService;

    @Autowired
    private EmergencyService emergencyService;

    private final TokenGenerate tokenGenerate = new TokenGenerate();


    @PostMapping("/login")
    public ResponseEntity<?> loginController(@RequestBody Map<String, String> body) {
        try {
            logger.info("Login attempt with body: {}", body);
            
            String code = body.get("code");
            if (code == null || code.isEmpty()) {
                logger.warn("Login attempt with empty code");
                return ResponseEntity.badRequest().body(Map.of("message", "code不能为空"));
            }

            // Log the WeChat configuration
            logger.info("Using WeChat config - appId: {}, secret: {}", 
                       weChatConfig.getAppid(), 
                       weChatConfig.getAppsecret().substring(0, 4) + "****");

            String url = "https://api.weixin.qq.com/sns/jscode2session" +
                    "?appid=" + weChatConfig.getAppid() +
                    "&secret=" + weChatConfig.getAppsecret() +
                    "&js_code=" + code +
                    "&grant_type=authorization_code";

            logger.debug("Calling WeChat API with URL: {}", url);
            String weChatApiResponse = HttpUtil.get(url);
            logger.info("WeChat API response: {}", weChatApiResponse);
            
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode resultNode;
            try {
                resultNode = objectMapper.readTree(weChatApiResponse);
            } catch (JsonProcessingException e) {
                logger.error("Failed to parse WeChat API response: {}", weChatApiResponse, e);
                return ResponseEntity.status(500).body(Map.of("message", "解析微信API响应失败", "details", e.getMessage()));
            }

            // Check for error in WeChat API response
            if (resultNode.has("errcode") && resultNode.get("errcode").asInt() != 0) {
                logger.warn("WeChat API returned error: {}", resultNode);
                return ResponseEntity.status(500).body(Map.of(
                    "message", "微信API返回错误",
                    "errcode", resultNode.get("errcode").asText(),
                    "errmsg", resultNode.has("errmsg") ? resultNode.get("errmsg").asText() : "未知错误"
                ));
            }

            // Check if openid exists in the response
            if (!resultNode.has("openid")) {
                logger.warn("WeChat API response missing openid: {}", resultNode);
                return ResponseEntity.status(500).body(Map.of("message", "获取 openid 失败", "details", weChatApiResponse));
            }

            String openId = resultNode.get("openid").asText();
            if (openId == null || openId.isEmpty()) {
                logger.warn("WeChat API returned empty openid");
                return ResponseEntity.status(500).body(Map.of("message", "获取 openid 为空", "details", weChatApiResponse));
            }

            logger.info("Successfully obtained openId: {}", openId);
            
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                logger.info("Creating new user for openId: {}", openId);
                userService.insertUser(openId);
                user = userService.getUserByOpenId(openId);
            }

            final User currentUser = user;
            logger.info("User found/created: id={}, type={}", currentUser.getId(), currentUser.getUserType());

            try {
                // --- Fetch Enriched Bind Info ---
                List<Bind> rawBinds = (currentUser.getUserType() == 0)
                        ? bindService.getBindByElderId(currentUser.getId())
                        : (currentUser.getUserType() == 1 ? bindService.getBindByGuardianId(currentUser.getId()) : java.util.Collections.emptyList());

                logger.debug("Fetched {} bindings for user {}", rawBinds.size(), currentUser.getId());

                List<Map<String, Object>> bindInfo = rawBinds.stream().map(bind -> {
                    Map<String, Object> bindingMap = new HashMap<>();
                    User partner = userService.getUserById(currentUser.getUserType() == 0 ? bind.getGuardianId() : bind.getElderId());
                    bindingMap.put("id", bind.getBindId());
                    bindingMap.put("bind_status", bind.getBindStatus());
                    if (partner != null) {
                        bindingMap.put("name", partner.getNickname());
                        bindingMap.put("phone", partner.getPhoneNumber());
                    }
                    
                    // Safe check for initiatorId which might be null for existing bindings
                    Integer initiatorId = bind.getInitiatorId();
                    boolean isActionable = bind.getBindStatus() == 0 && 
                                          (initiatorId != null && !initiatorId.equals(currentUser.getId()));
                    bindingMap.put("is_actionable", isActionable);
                    
                    return bindingMap;
                }).collect(Collectors.toList());


                // --- Fetch Enriched Service Info ---
                List<Service> rawServices = serviceService.getServicesForUser(currentUser.getId());
                logger.debug("Fetched {} services for user {}", rawServices.size(), currentUser.getId());
                
                List<Map<String, Object>> serviceInfo = rawServices.stream().map(service -> {
                    Map<String, Object> serviceMap = new HashMap<>();
                    serviceMap.put("serviceId", service.getServiceId());
                    serviceMap.put("serviceType", service.getServiceType());
                    serviceMap.put("serviceDes", service.getServiceDes());
                    serviceMap.put("appointedAddress", service.getAppointedAddress());
                    serviceMap.put("scheduledTime", service.getScheduledTime());
                    serviceMap.put("serviceStatus", service.getServiceStatus());
                    
                    User target = userService.getUserById(service.getTargetId());
                    User creator = userService.getUserById(service.getCreatorId());
                    
                    serviceMap.put("targetName", target != null ? target.getNickname() : null);
                    serviceMap.put("creatorName", creator != null ? creator.getNickname() : null);
                    
                    return serviceMap;
                }).collect(Collectors.toList());

                // --- Fetch Emergency Info ---
                List<Emergency> emergencyInfo = (currentUser.getUserType() == 0)
                        ? emergencyService.getEmergencyByUserId(currentUser.getId())
                        : java.util.Collections.emptyList();
                
                logger.debug("Fetched {} emergency settings for user {}", emergencyInfo.size(), currentUser.getId());


                String token = tokenGenerate.TokenGenerate(openId, currentUser.getUserType());
                logger.info("Generated token for user {}", currentUser.getId());

                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("token", token);
                responseMap.put("userInfo", currentUser);
                responseMap.put("serviceInfo", serviceInfo);
                responseMap.put("emergencyInfo", emergencyInfo);
                responseMap.put("bindInfo", bindInfo);

                return ResponseEntity.ok(responseMap);
            } catch (Exception e) {
                logger.error("Error processing user data for login", e);
                return ResponseEntity.status(500).body(Map.of("message", "处理用户数据失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Unexpected error during login", e);
            return ResponseEntity.status(500).body(Map.of("message", "登录过程中发生错误: " + e.getMessage()));
        }
    }
}



