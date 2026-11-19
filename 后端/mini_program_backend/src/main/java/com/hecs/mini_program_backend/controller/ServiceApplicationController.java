package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.ServiceApplication;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.ServiceApplicationService;
import com.hecs.mini_program_backend.service.ServiceFulfillmentService;
import com.hecs.mini_program_backend.service.UserService;
import com.hecs.mini_program_backend.utils.TokenParse;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceApplicationController {
    @Autowired
    private ServiceApplicationService applicationService;

    @Autowired
    private ServiceFulfillmentService fulfillmentService;

    @Autowired
    private UserService userService;

    private User requester(String token) {
        String openId;
        try {
            openId = TokenParse.parseToken(token.replace("Bearer ", "")).openId();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "无效的token");
        }
        User user = userService.getUserByOpenId(openId);
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户不存在");
        return user;
    }

    @GetMapping("/available")
    public ResponseEntity<?> available(@RequestHeader("Authorization") String token,
                                        @RequestParam(defaultValue = "1") int page,
                                        @RequestParam(defaultValue = "10") int pageSize) {
        User worker = requester(token);
        if (!applicationService.isDeclaredWorker(worker)) return ResponseEntity.status(403).build();
        if (page < 1 || pageSize < 1 || pageSize > 100) return ResponseEntity.badRequest().build();
        Page<Service> result = applicationService.available(PageRequest.of(page - 1, pageSize,
                Sort.by(Sort.Direction.DESC, "serviceId")));
        // 地址、姓名、老人 ID、创建人 ID 均不得在客户批准前暴露给申请者。
        List<Map<String, Object>> publicServices = result.getContent().stream()
                .map(service -> Map.<String, Object>of(
                        "serviceId", service.getServiceId(),
                        "type", service.getServiceType(),
                        "scheduledTime", service.getScheduledTime() == null ? "" : service.getScheduledTime().toString()))
                .toList();
        return ResponseEntity.ok(Map.of("data", publicServices, "total", result.getTotalElements(),
                "page", page, "pageSize", pageSize));
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<?> apply(@RequestHeader("Authorization") String token, @PathVariable Integer id) {
        ServiceApplication application = applicationService.apply(id, requester(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true,
                "applicationId", application.getApplicationId(), "status", application.getStatus(),
                "message", "申请已发送，需老人或监护人批准"));
    }

    @GetMapping("/{id}/applications")
    public ResponseEntity<?> applications(@RequestHeader("Authorization") String token, @PathVariable Integer id) {
        List<Map<String, Object>> data = applicationService.applications(id, requester(token)).stream()
                .map(application -> {
                    User worker = userService.getUserById(application.getApplicantId());
                    return Map.<String, Object>of("applicationId", application.getApplicationId(),
                            "applicantId", application.getApplicantId(), "status", application.getStatus(),
                            "name", worker == null || worker.getNickname() == null ? "未填写" : worker.getNickname());
                }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/{id}/applications/{applicationId}/approve")
    public ResponseEntity<?> approve(@RequestHeader("Authorization") String token,
                                      @PathVariable Integer id, @PathVariable Integer applicationId) {
        Service service = applicationService.approve(id, applicationId, requester(token));
        return ResponseEntity.ok(Map.of("success", true, "serviceId", service.getServiceId(),
                "providerId", service.getProviderId(), "status", service.getServiceStatus(),
                "message", "已批准接单，服务人员现可查看详情"));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@RequestHeader("Authorization") String token, @PathVariable Integer id) {
        Service service = fulfillmentService.start(id, requester(token));
        return ResponseEntity.ok(Map.of("serviceId", id, "status", service.getServiceStatus(),
                "startedAt", service.getServiceStartedAt().toString(),
                "message", "服务人员已声明开始；系统尚不能验证线下到场"));
    }

    @PostMapping("/{id}/request-completion")
    public ResponseEntity<?> requestCompletion(@RequestHeader("Authorization") String token,
                                                @PathVariable Integer id) {
        Service service = fulfillmentService.requestCompletion(id, requester(token));
        return ResponseEntity.ok(Map.of("serviceId", id, "status", service.getServiceStatus(),
                "requestedAt", service.getCompletionRequestedAt().toString(),
                "message", "已提交完工声明，等待老人或监护人确认"));
    }

    @PostMapping("/{id}/confirm-completion")
    public ResponseEntity<?> confirmCompletion(@RequestHeader("Authorization") String token,
                                                @PathVariable Integer id) {
        Service service = fulfillmentService.confirmCompletion(id, requester(token));
        return ResponseEntity.ok(Map.of("serviceId", id, "status", service.getServiceStatus(),
                "confirmedAt", service.getCompletionConfirmedAt().toString(),
                "message", "当事人已确认完工；支付尚未开通"));
    }
}
