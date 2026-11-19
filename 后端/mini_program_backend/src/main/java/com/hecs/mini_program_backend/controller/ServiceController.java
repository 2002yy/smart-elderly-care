package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.BindService;
import com.hecs.mini_program_backend.service.ServiceService;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenParse;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceController {
    private static final Logger logger = LoggerFactory.getLogger(ServiceController.class);
    // 现有数据库 provider_id 不可为空；0 明确表示尚无真实派单，不能授权读取订单。
    private static final Integer UNASSIGNED_PROVIDER_ID = 0;

    @Autowired
    private ServiceService serviceService;

    @Autowired
    private UserService userService;

    @Autowired
    private BindService bindService;

    private boolean canCreateServiceFor(User user, Integer targetId) {
        if (user.getId() == null || user.getUserType() == null || targetId == null) {
            return false;
        }
        if (user.getUserType() == 0) {
            return user.getId().equals(targetId); // 老人只能为自己预约
        }
        if (user.getUserType() == 1) {
            return bindService.getBindingsByElderAndGuardianId(targetId, user.getId()).stream()
                    .anyMatch(bind -> Integer.valueOf(1).equals(bind.getBindStatus()));
        }
        return false;
    }

    private boolean isServiceEditor(Service service, User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        Integer userId = user.getId();
        return userId.equals(service.getCreatorId())
                || userId.equals(service.getTargetId());
    }

    private boolean isServiceParticipant(Service service, User user) {
        return isServiceEditor(service, user)
                || (user != null && user.getId() != null && Integer.valueOf(2).equals(user.getUserType())
                && service.getProviderId() != null && service.getProviderId() > 0
                && user.getId().equals(service.getProviderId()));
    }

    private Map<String, Object> createServiceResponseMap(Service service) {
        try {
            Map<String, Object> serviceMap = new HashMap<>();
            serviceMap.put("serviceId", service.getServiceId());
            serviceMap.put("id", service.getServiceId());
            serviceMap.put("serviceType", service.getServiceType());
            serviceMap.put("type", service.getServiceType());
            serviceMap.put("serviceDes", service.getServiceDes());
            serviceMap.put("remark", service.getServiceDes());
            serviceMap.put("appointedAddress", service.getAppointedAddress());
            serviceMap.put("address", service.getAppointedAddress());
            serviceMap.put("scheduledTime", service.getScheduledTime());
            serviceMap.put("serviceStatus", service.getServiceStatus());
            serviceMap.put("status", service.getServiceStatus());
            serviceMap.put("createTime", service.getCreateTime());
            serviceMap.put("updateTime", service.getUpdateTime());
            
            User target = null;
            User creator = null;
            User provider = null;
            
            if (service.getTargetId() != null) {
                target = userService.getUserById(service.getTargetId());
            }
            
            if (service.getCreatorId() != null) {
                creator = userService.getUserById(service.getCreatorId());
            }
            
            if (service.getProviderId() != null && service.getProviderId() > 0) {
                provider = userService.getUserById(service.getProviderId());
            }

            serviceMap.put("targetId", service.getTargetId());
            serviceMap.put("targetName", target != null ? target.getNickname() : null);
            serviceMap.put("clientName", target != null ? target.getNickname() : null);
            serviceMap.put("creatorId", service.getCreatorId());
            serviceMap.put("creatorName", creator != null ? creator.getNickname() : null);
            serviceMap.put("providerId", service.getProviderId());
            serviceMap.put("providerName", provider != null ? provider.getNickname() : null);
            serviceMap.put("staffName", provider != null ? provider.getNickname() : null);

            return serviceMap;
        } catch (Exception e) {
            logger.error("Error creating service response map for service ID {}", service.getServiceId(), e);
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("serviceId", service.getServiceId());
            errorMap.put("id", service.getServiceId());
            errorMap.put("error", "Error processing service data");
            return errorMap;
        }
    }

    @GetMapping("")
    public ResponseEntity<?> getServices(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status) {
        try {
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }
            
            Pageable pageable = PageRequest.of(page - 1, pageSize);
            Page<Service> servicePage = serviceService.getServicesForUser(user.getId(), pageable);
            
            List<Map<String, Object>> serviceList = servicePage.getContent().stream()
                .map(this::createServiceResponseMap)
                .collect(java.util.stream.Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("data", serviceList);
            response.put("total", servicePage.getTotalElements());
            response.put("page", page);
            response.put("pageSize", pageSize);
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            logger.error("Invalid token", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            logger.error("Error getting services", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "获取服务列表失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getServiceDetail(
            @RequestHeader("Authorization") String token,
            @PathVariable String id) {
        try {
            logger.info("Fetching service detail for ID: {}", id);
            
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                logger.warn("User not found for openId: {}", openId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }
            
            // Try to parse the ID as an integer
            Integer serviceId;
            try {
                serviceId = Integer.parseInt(id);
            } catch (NumberFormatException e) {
                logger.error("Invalid service ID format: {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的服务ID格式"));
            }
            
            // Get the service
            Service service = serviceService.getServiceById(serviceId);
            if (service == null) {
                logger.warn("Service not found with ID: {}", serviceId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "服务不存在"));
            }
            if (!isServiceParticipant(service, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "无权查看此服务"));
            }
            
            logger.info("Service found: ID={}, Type={}, Status={}", 
                      service.getServiceId(), service.getServiceType(), service.getServiceStatus());
            
            Map<String, Object> serviceMap = createServiceResponseMap(service);
            
            // Add ID fields explicitly to ensure frontend compatibility
            serviceMap.put("id", service.getServiceId());
            serviceMap.put("serviceId", service.getServiceId());
            
            logger.debug("Returning service data: {}", serviceMap);
            
            return ResponseEntity.ok(serviceMap);
        } catch (JwtException e) {
            logger.error("Invalid token when fetching service detail", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            logger.error("Error getting service detail for ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "获取服务详情失败: " + e.getMessage()));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createService(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {
        try {
            logger.info("Create service request: {}", body);
            
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                logger.warn("User not found for openId: {}", openId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }

            // --- Validation ---
            if (body.get("targetId") == null) {
                logger.warn("Missing targetId in service creation request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "服务对象ID不能为空"));
            }
            if (body.get("type") == null) {
                logger.warn("Missing type in service creation request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "服务类型不能为空"));
            }
            if (body.get("scheduledTime") == null) {
                logger.warn("Missing scheduledTime in service creation request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "预约时间不能为空"));
            }
            if (body.get("address") == null) {
                logger.warn("Missing address in service creation request");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "服务地址不能为空"));
            }
            if (body.containsKey("providerId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "服务人员由服务端派单，预约时不能指定"));
            }

            Service service = new Service();
            try {
                service.setServiceType(Integer.parseInt(body.get("type").toString()));
                Integer targetId = Integer.parseInt(body.get("targetId").toString());
                if (!canCreateServiceFor(user, targetId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "只能为自己或已确认绑定的老人预约服务"));
                }
                service.setTargetId(targetId);
                service.setScheduledTime(Instant.parse(body.get("scheduledTime").toString()));
                service.setAppointedAddress(body.get("address").toString());

                if (body.containsKey("remark")) {
                    service.setServiceDes(body.get("remark").toString());
                }

                service.setCreatorId(user.getId());
                
                // 未实现真实指派：不得把 ID 1、5 或客户传入的 ID 冒充已分配服务人员。
                service.setProviderId(UNASSIGNED_PROVIDER_ID);
                
                logger.info("Creating service: type={}, targetId={}, creatorId={}, providerId={}", 
                           service.getServiceType(), service.getTargetId(), service.getCreatorId(), service.getProviderId());
                
                Service createdService = serviceService.createService(service);
                logger.info("Service created successfully with ID: {}", createdService.getServiceId());
                
                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("success", true);
                responseMap.put("message", "创建服务成功");
                responseMap.put("service", createServiceResponseMap(createdService));
                
                return ResponseEntity.status(HttpStatus.CREATED).body(responseMap);
            } catch (NumberFormatException e) {
                logger.error("Invalid number format in service creation", e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的ID或类型格式"));
            } catch (Exception e) {
                logger.error("Error creating service", e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "创建服务失败: " + e.getMessage()));
            }
        } catch (JwtException e) {
            logger.error("Invalid token", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            logger.error("Unexpected error in service creation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "创建服务失败: " + e.getMessage()));
        }
    }

    @PostMapping("/update/{id}")
    public ResponseEntity<?> updateService(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        try {
            logger.info("Update service request for ID {}: {}", id, body);
            
            // 解析token
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                logger.warn("User not found for openId: {}", openId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }
            
            // 获取服务
            Service service = serviceService.getServiceById(id);
            if (service == null) {
                logger.warn("Service not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "服务不存在"));
            }
            if (!isServiceEditor(service, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "无权修改此服务"));
            }
            // 通用资料编辑接口不能确认支付、评价或完成状态；这些是独立的业务事实。
            if (body.containsKey("status") || body.containsKey("serviceStatus")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "不能通过资料编辑接口直接修改服务状态"));
            }
            // 服务对象决定谁能查看订单；不能通过资料编辑更换授权主体。
            if (body.containsKey("targetId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "不能通过资料编辑接口更换服务对象"));
            }
            
            // 更新服务
            if (body.containsKey("type")) {
                service.setServiceType(Integer.parseInt(body.get("type").toString()));
                logger.debug("Updated service type to: {}", service.getServiceType());
            }
            if (body.containsKey("scheduledTime")) {
                service.setScheduledTime(Instant.parse(body.get("scheduledTime").toString()));
                logger.debug("Updated scheduled time to: {}", service.getScheduledTime());
            }
            if (body.containsKey("address")) {
                service.setAppointedAddress(body.get("address").toString());
                logger.debug("Updated address to: {}", service.getAppointedAddress());
            }
            if (body.containsKey("remark")) {
                service.setServiceDes(body.get("remark").toString());
                logger.debug("Updated description to: {}", service.getServiceDes());
            }
            
            // 保存服务
            logger.info("Saving service updates for ID: {}", id);
            Service updatedService = serviceService.updateService(service);
            logger.info("Service updated successfully for ID: {}", id);
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("success", true);
            responseMap.put("message", "更新服务成功");
            responseMap.put("service", createServiceResponseMap(updatedService));
            
            return ResponseEntity.ok(responseMap);
        } catch (JwtException e) {
            logger.error("Invalid token in update request", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (NumberFormatException e) {
            logger.error("Invalid number format in service update", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "无效的数值格式: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating service with ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "更新服务失败: " + e.getMessage()));
        }
    }

    @PostMapping("/cancel/{id}")
    public ResponseEntity<?> cancelService(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {
        try {
            // 解析token
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取服务
            Service service = serviceService.getServiceById(id);
            if (service == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("服务不存在");
            }
            
            // 检查权限
            if (!service.getCreatorId().equals(user.getId()) && !service.getTargetId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("无权取消此服务");
            }
            
            // 删除服务
            serviceService.deleteService(id);
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "取消服务成功");
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("取消服务失败: " + e.getMessage());
        }
    }

    @PostMapping("/evaluate/{id}")
    public ResponseEntity<?> evaluateService(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        try {
            // 解析token
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户不存在");
            }
            
            // 获取服务
            Service service = serviceService.getServiceById(id);
            if (service == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("服务不存在");
            }
            
            // 检查权限
            if (!service.getTargetId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("无权评价此服务");
            }
            
            // 检查状态
            if (service.getServiceStatus() != 4) { // 待评价状态
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("服务状态不正确，无法评价");
            }
            // 接受旧客户端显式传入的 5，但评价结束状态由服务端确定。
            if ((body.containsKey("status") && !"5".equals(String.valueOf(body.get("status"))))
                    || body.containsKey("serviceStatus")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("评价不能指定其他服务状态");
            }
            
            // 更新服务评价
            // 使用正确的评价字段：serviceEvaluationStars和serviceEvaluationNotes
            Service updatedService;
            try {
                // 记录收到的请求体以便调试
                logger.info("Received evaluation request body: {}", body);
                
                // 设置评分 - 检查多个可能的字段名
                if (body.containsKey("serviceEvaluationStars")) {
                    service.setServiceEvaluationStars(Integer.parseInt(body.get("serviceEvaluationStars").toString()));
                    logger.info("Updated evaluation stars to: {} (from serviceEvaluationStars)", service.getServiceEvaluationStars());
                } else if (body.containsKey("rating")) {
                    service.setServiceEvaluationStars(Integer.parseInt(body.get("rating").toString()));
                    logger.info("Updated evaluation stars to: {} (from rating)", service.getServiceEvaluationStars());
                }
                
                // 设置评价内容 - 检查多个可能的字段名
                if (body.containsKey("serviceEvaluationNotes")) {
                    service.setServiceEvaluationNotes(body.get("serviceEvaluationNotes").toString());
                    logger.info("Updated evaluation notes to: {} (from serviceEvaluationNotes)", service.getServiceEvaluationNotes());
                } else if (body.containsKey("comment")) {
                    service.setServiceEvaluationNotes(body.get("comment").toString());
                    logger.info("Updated evaluation notes to: {} (from comment)", service.getServiceEvaluationNotes());
                }
                
                service.setServiceStatus(5); // 已完成状态，由服务端决定
                
                // 保存服务
                updatedService = serviceService.updateService(service);
                logger.info("Service evaluation updated successfully for ID: {}", service.getServiceId());
            } catch (NumberFormatException e) {
                logger.error("Invalid number format in evaluation request", e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "评分或状态格式不正确"));
            }
            
            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "评价服务成功");
            response.put("service", createServiceResponseMap(updatedService));
            
            return ResponseEntity.ok(response);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("评价服务失败: " + e.getMessage());
        }
    }

    /**
     * 历史支付入口：未对接支付平台前不能将状态标记为已付款。
     */
    @PostMapping("/payment/{id}")
    public ResponseEntity<?> paymentService(
            @RequestHeader("Authorization") String token,
            @PathVariable Integer id) {
        try {
            logger.info("Payment request for service ID: {}", id);
            
            // 解析token
            String openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
            
            // 获取用户信息
            User user = userService.getUserByOpenId(openId);
            if (user == null) {
                logger.warn("User not found for openId: {}", openId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "用户不存在"));
            }
            
            // 获取服务
            Service service = serviceService.getServiceById(id);
            if (service == null) {
                logger.warn("Service not found with ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "服务不存在"));
            }
            if (!isServiceParticipant(service, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "无权访问此服务"));
            }
            // 没有真实支付订单或回调验证渠道，返回可识别的失败供旧客户端处理。
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                    .body(Map.of("success", false, "paid", false, "message", "尚未接入真实支付，不能确认付款"));
        } catch (JwtException e) {
            logger.error("Invalid token in payment request", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "无效的token"));
        } catch (Exception e) {
            logger.error("Error processing payment for service ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "支付处理失败: " + e.getMessage()));
        }
    }
}
