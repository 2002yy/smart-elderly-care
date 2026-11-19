package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.ServiceService;
import com.hecs.mini_program_backend.service.ServiceApplicationService;
import com.hecs.mini_program_backend.service.ServiceAppointmentService;
import com.hecs.mini_program_backend.service.ServiceCustomerAccess;
import com.hecs.mini_program_backend.service.ServiceFulfillmentService;
import com.hecs.mini_program_backend.service.UserService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ServiceControllerSecurityTest {

    private static final String SIGNATURE = "com.hecs.mini_program_backend.utils";

    private ServiceService serviceService;
    private ServiceApplicationService applicationService;
    private ServiceFulfillmentService fulfillmentService;
    private ServiceAppointmentService appointmentService;
    private ServiceCustomerAccess customerAccess;
    private UserService userService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        serviceService = mock(ServiceService.class);
        applicationService = mock(ServiceApplicationService.class);
        fulfillmentService = mock(ServiceFulfillmentService.class);
        appointmentService = mock(ServiceAppointmentService.class);
        customerAccess = mock(ServiceCustomerAccess.class);
        userService = mock(UserService.class);

        ServiceController controller = new ServiceController();
        ReflectionTestUtils.setField(controller, "serviceService", serviceService);
        ReflectionTestUtils.setField(controller, "applicationService", applicationService);
        ReflectionTestUtils.setField(controller, "fulfillmentService", fulfillmentService);
        ReflectionTestUtils.setField(controller, "appointmentService", appointmentService);
        ReflectionTestUtils.setField(controller, "customerAccess", customerAccess);
        ReflectionTestUtils.setField(controller, "userService", userService);

        when(applicationService.isDeclaredWorker(any(User.class))).thenAnswer(invocation -> {
            User candidate = invocation.getArgument(0);
            return candidate.getUserType() != null && candidate.getUserType() >= 2
                    && candidate.getUserType() <= 4;
        });
        // 这里仅验证 controller 是否使用客户权限门禁；绑定状态由 H2 关键路径测试覆盖。
        when(customerAccess.canManageService(any(Service.class), any(User.class))).thenAnswer(invocation -> {
            Service service = invocation.getArgument(0);
            User requester = invocation.getArgument(1);
            return requester.getId().equals(service.getCreatorId())
                    || requester.getId().equals(service.getTargetId());
        });

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void malformedTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", "Bearer malformed-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unrelatedUserCannotReadServiceAddressOrNames() throws Exception {
        User requester = user(99, "stranger");
        Service service = service(10, 1, 2, 3, 0);
        service.setAppointedAddress("老人家庭地址");
        when(userService.getUserByOpenId("stranger")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(get("/api/services/10")
                        .header("Authorization", bearer("stranger", 0)))
                .andExpect(status().isForbidden());

        verify(userService, never()).getUserById(2);
    }

    @Test
    void assignedProviderCanReadServiceDetail() throws Exception {
        User requester = user(3, "provider");
        requester.setUserType(2);
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("provider")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);
        when(applicationService.hasApprovedAssignment(10, 3)).thenReturn(true);

        mockMvc.perform(get("/api/services/10")
                        .header("Authorization", bearer("provider", 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceId").value(10));
    }

    @Test
    void legacyProviderIdWithoutConsentNeverGrantsPrivateDetailAccess() throws Exception {
        User requester = user(3, "legacy-provider");
        requester.setUserType(2);
        Service service = service(10, 1, 2, 3, 1);
        service.setAppointedAddress("未获授权的住址");
        when(userService.getUserByOpenId("legacy-provider")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(get("/api/services/10")
                        .header("Authorization", bearer("legacy-provider", 2)))
                .andExpect(status().isForbidden());

        verify(userService, never()).getUserById(2);
    }

    @Test
    void unassignedProviderSentinelNeverGrantsDetailAccess() throws Exception {
        User requester = user(0, "not-assigned");
        requester.setUserType(2);
        Service service = service(10, 1, 2, 0, 0);
        when(userService.getUserByOpenId("not-assigned")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(get("/api/services/10")
                        .header("Authorization", bearer("not-assigned", 2)))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCannotSupplyProviderIdWhenCreatingService() throws Exception {
        User requester = user(1, "creator");
        when(userService.getUserByOpenId("creator")).thenReturn(requester);

        mockMvc.perform(post("/api/services/create")
                        .header("Authorization", bearer("creator", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetId":1,"providerId":5,"type":1,
                                 "scheduledTime":"2030-01-02T03:04:05Z","address":"老人家庭地址"}
                                """))
                .andExpect(status().isBadRequest());

        verify(serviceService, never()).createService(any(Service.class));
    }

    @Test
    void assignedProviderCannotEditClientDetails() throws Exception {
        User requester = user(3, "provider");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("provider")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/update/10")
                        .header("Authorization", bearer("provider", 2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"address\":\"私自改地址\"}"))
                .andExpect(status().isForbidden());

        verify(appointmentService, never()).edit(eq(10), eq(requester), anyMap());
    }

    @Test
    void unrelatedUserCannotUpdateServiceOrForgeStatus() throws Exception {
        User requester = user(99, "stranger");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("stranger")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/update/10")
                        .header("Authorization", bearer("stranger", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"address\":\"恶意覆盖\",\"status\":5,\"serviceStatus\":4}"))
                .andExpect(status().isForbidden());

        verify(appointmentService, never()).edit(eq(10), eq(requester), anyMap());
        org.junit.jupiter.api.Assertions.assertEquals(0, service.getServiceStatus());
    }

    @Test
    void creatorCanStillUpdateServiceDetails() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);
        when(appointmentService.edit(eq(10), eq(requester), anyMap())).thenAnswer(invocation -> {
            service.setServiceDes("修改后的预约说明");
            return service;
        });

        mockMvc.perform(post("/api/services/update/10")
                        .header("Authorization", bearer("creator", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"remark\":\"修改后的预约说明\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(appointmentService).edit(eq(10), eq(requester), anyMap());
        org.junit.jupiter.api.Assertions.assertEquals("修改后的预约说明", service.getServiceDes());
    }

    @Test
    void creatorCannotReassignServiceTargetThroughEdit() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/update/10")
                        .header("Authorization", bearer("creator", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetId\":99,\"address\":\"同时修改地址\"}"))
                .andExpect(status().isBadRequest());

        verify(appointmentService, never()).edit(eq(10), eq(requester), anyMap());
        org.junit.jupiter.api.Assertions.assertEquals(2, service.getTargetId());
        org.junit.jupiter.api.Assertions.assertNull(service.getAppointedAddress());
    }

    @Test
    void unrelatedUserCannotCancelService() throws Exception {
        User requester = user(99, "requester");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("requester")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/cancel/10")
                        .header("Authorization", bearer("requester", 0)))
                .andExpect(status().isForbidden());

        verify(fulfillmentService, never()).cancelService(10, requester);
    }

    @Test
    void creatorCanCancelService() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 0);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/cancel/10")
                        .header("Authorization", bearer("creator", 0)))
                .andExpect(status().isOk());

        verify(fulfillmentService).cancelService(10, requester);
    }

    @Test
    void creatorCannotDeleteInProgressOrHistoricalService() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 0, 2);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        for (int statusValue : new int[]{2, 3, 4, 5}) {
            service.setServiceStatus(statusValue);
            mockMvc.perform(post("/api/services/cancel/10")
                            .header("Authorization", bearer("creator", 0)))
                    .andExpect(status().isConflict());
        }

        verify(fulfillmentService, never()).cancelService(10, requester);
    }

    @Test
    void unrelatedUserCannotEvaluateService() throws Exception {
        User requester = user(99, "requester");
        Service service = service(10, 1, 2, 3, 4);
        when(userService.getUserByOpenId("requester")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/evaluate/10")
                        .header("Authorization", bearer("requester", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"很好\"}"))
                .andExpect(status().isForbidden());

        verify(serviceService, never()).updateService(any(Service.class));
    }

    @Test
    void evaluationRequiresWaitingForEvaluationStatus() throws Exception {
        User requester = user(2, "target");
        Service service = service(10, 1, 2, 3, 3);
        when(userService.getUserByOpenId("target")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/evaluate/10")
                        .header("Authorization", bearer("target", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"很好\"}"))
                .andExpect(status().isBadRequest());

        verify(serviceService, never()).updateService(any(Service.class));
    }

    @Test
    void validEvaluationMovesStatusFromFourToFive() throws Exception {
        User requester = user(2, "target");
        Service service = service(10, 1, 2, 3, 4);
        when(userService.getUserByOpenId("target")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);
        when(serviceService.updateService(any(Service.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/services/evaluate/10")
                        .header("Authorization", bearer("target", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"很好\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(serviceService).updateService(service);
        org.junit.jupiter.api.Assertions.assertEquals(5, service.getServiceStatus());
        org.junit.jupiter.api.Assertions.assertEquals(5, service.getServiceEvaluationStars());
        org.junit.jupiter.api.Assertions.assertEquals("很好", service.getServiceEvaluationNotes());
    }

    @Test
    void evaluationCannotOverrideServerControlledCompletionStatus() throws Exception {
        User requester = user(2, "target");
        Service service = service(10, 1, 2, 3, 4);
        when(userService.getUserByOpenId("target")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        for (String payload : new String[]{"{\"rating\":5,\"status\":3}",
                "{\"rating\":5,\"status\":6}", "{\"rating\":5,\"serviceStatus\":4}"}) {
            mockMvc.perform(post("/api/services/evaluate/10")
                            .header("Authorization", bearer("target", 0))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                    .andExpect(status().isBadRequest());
        }

        verify(serviceService, never()).updateService(any(Service.class));
        org.junit.jupiter.api.Assertions.assertEquals(4, service.getServiceStatus());
        org.junit.jupiter.api.Assertions.assertNull(service.getServiceEvaluationStars());
    }

    @Test
    void legacyEvaluationStatusFiveStillWorks() throws Exception {
        User requester = user(2, "target");
        Service service = service(10, 1, 2, 3, 4);
        when(userService.getUserByOpenId("target")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);
        when(serviceService.updateService(any(Service.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/services/evaluate/10")
                        .header("Authorization", bearer("target", 0))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serviceEvaluationStars\":5,\"status\":5}"))
                .andExpect(status().isOk());

        verify(serviceService).updateService(service);
        org.junit.jupiter.api.Assertions.assertEquals(5, service.getServiceStatus());
    }

    @Test
    void unrelatedUserCannotInvokeLegacyPayment() throws Exception {
        User requester = user(99, "stranger");
        Service service = service(10, 1, 2, 3, 3);
        when(userService.getUserByOpenId("stranger")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", bearer("stranger", 0)))
                .andExpect(status().isForbidden());

        verify(serviceService, never()).updateService(any(Service.class));
    }

    @Test
    void paymentWithoutGatewayNeverClaimsSuccess() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 3);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", bearer("creator", 0)))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.paid").value(false));

        verify(serviceService, never()).updateService(any(Service.class));
        org.junit.jupiter.api.Assertions.assertEquals(3, service.getServiceStatus());
    }

    @Test
    void authorizedEditorCannotForgePaymentOrCompletionThroughAliases() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 3);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        for (String payload : new String[]{"{\"serviceStatus\":4}", "{\"status\":5}"}) {
            mockMvc.perform(post("/api/services/update/10")
                            .header("Authorization", bearer("creator", 0))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                    .andExpect(status().isBadRequest());
        }

        verify(serviceService, never()).updateService(any(Service.class));
        org.junit.jupiter.api.Assertions.assertEquals(3, service.getServiceStatus());
    }

    private static User user(Integer id, String openId) {
        User user = new User();
        user.setId(id);
        user.setOpenId(openId);
        user.setUserType(0);
        user.setNickname(openId);
        return user;
    }

    private static Service service(Integer id, Integer creatorId, Integer targetId,
                                   Integer providerId, Integer status) {
        Service service = new Service();
        service.setServiceId(id);
        service.setCreatorId(creatorId);
        service.setTargetId(targetId);
        service.setProviderId(providerId);
        service.setServiceStatus(status);
        service.setServiceType(1);
        return service;
    }

    private static String bearer(String openId, int userType) {
        SecretKey key = Keys.hmacShaKeyFor(SIGNATURE.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .claim("openid", openId)
                .claim("user_type", userType)
                .setExpiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
        return "Bearer " + token;
    }
}
