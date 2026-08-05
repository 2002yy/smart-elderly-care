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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/login")
    public ResponseEntity<?> loginController(@RequestBody Map<String, String> body) {
        try {
            logger.info("Login attempt received");

            String code = body.get("code");
            if (code == null || code.isBlank()) {
                logger.warn("Login attempt with empty code");
                return ResponseEntity.badRequest().body(Map.of("message", "code不能为空"));
            }

            if (weChatConfig.getAppid() == null || weChatConfig.getAppid().isBlank()
                    || weChatConfig.getAppsecret() == null || weChatConfig.getAppsecret().isBlank()) {
                logger.error("WeChat credentials are not configured");
                return ResponseEntity.status(503).body(Map.of("message", "微信登录配置不可用"));
            }

            String url = "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid=" + weChatConfig.getAppid()
                    + "&secret=" + weChatConfig.getAppsecret()
                    + "&js_code=" + code
                    + "&grant_type=authorization_code";

            String weChatApiResponse = HttpUtil.get(url);
            JsonNode resultNode;
            try {
                resultNode = objectMapper.readTree(weChatApiResponse);
            } catch (JsonProcessingException e) {
                logger.error("Failed to parse WeChat API response", e);
                return ResponseEntity.status(502).body(Map.of("message", "解析微信API响应失败"));
            }

            if (resultNode.has("errcode") && resultNode.get("errcode").asInt() != 0) {
                logger.warn("WeChat API returned error code {}", resultNode.get("errcode").asInt());
                return ResponseEntity.status(502).body(Map.of(
                        "message", "微信API返回错误",
                        "errcode", resultNode.get("errcode").asText(),
                        "errmsg", resultNode.has("errmsg") ? resultNode.get("errmsg").asText() : "未知错误"
                ));
            }

            if (!resultNode.hasNonNull("openid") || resultNode.get("openid").asText().isBlank()) {
                logger.warn("WeChat API response did not contain a usable openid");
                return ResponseEntity.status(502).body(Map.of("message", "获取 openid 失败"));
            }

            String openId = resultNode.get("openid").asText();
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                userService.insertUser(openId);
                user = userService.getUserByOpenId(openId);
            }
            if (user == null) {
                logger.error("User creation did not produce a readable user record");
                return ResponseEntity.status(500).body(Map.of("message", "创建用户失败"));
            }

            User currentUser = user;
            List<Bind> rawBinds = switch (currentUser.getUserType() == null ? -1 : currentUser.getUserType()) {
                case 0 -> bindService.getBindByElderId(currentUser.getId());
                case 1 -> bindService.getBindByGuardianId(currentUser.getId());
                default -> Collections.emptyList();
            };

            List<Map<String, Object>> bindInfo = rawBinds.stream().map(bind -> {
                Map<String, Object> bindingMap = new HashMap<>();
                User partner = userService.getUserById(
                        currentUser.getUserType() == 0 ? bind.getGuardianId() : bind.getElderId()
                );
                bindingMap.put("id", bind.getBindId());
                bindingMap.put("bind_status", bind.getBindStatus());
                if (partner != null) {
                    bindingMap.put("name", partner.getNickname());
                    bindingMap.put("phone", partner.getPhoneNumber());
                }

                Integer initiatorId = bind.getInitiatorId();
                boolean isActionable = bind.getBindStatus() == 0
                        && initiatorId != null
                        && !initiatorId.equals(currentUser.getId());
                bindingMap.put("is_actionable", isActionable);
                return bindingMap;
            }).collect(Collectors.toList());

            List<Service> rawServices = serviceService.getServicesForUser(currentUser.getId());
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

            List<Emergency> emergencyInfo = currentUser.getUserType() != null && currentUser.getUserType() == 0
                    ? emergencyService.getEmergencyByUserId(currentUser.getId())
                    : Collections.emptyList();

            String token = tokenGenerate.TokenGenerate(openId, currentUser.getUserType());
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("token", token);
            responseMap.put("userInfo", currentUser);
            responseMap.put("serviceInfo", serviceInfo);
            responseMap.put("emergencyInfo", emergencyInfo);
            responseMap.put("bindInfo", bindInfo);

            logger.info("Login completed for user id {}", currentUser.getId());
            return ResponseEntity.ok(responseMap);
        } catch (Exception e) {
            logger.error("Unexpected error during login", e);
            return ResponseEntity.status(500).body(Map.of("message", "登录过程中发生错误"));
        }
    }
}
