package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.service.ServiceService;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ServiceControllerSecurityTest {

    private static final String SIGNATURE = "com.hecs.mini_program_backend.utils";

    private ServiceService serviceService;
    private UserService userService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        serviceService = mock(ServiceService.class);
        userService = mock(UserService.class);

        ServiceController controller = new ServiceController();
        ReflectionTestUtils.setField(controller, "serviceService", serviceService);
        ReflectionTestUtils.setField(controller, "userService", userService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void malformedTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", "Bearer malformed-token"))
                .andExpect(status().isUnauthorized());
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

        verify(serviceService, never()).deleteService(10);
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

        verify(serviceService).deleteService(10);
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
    void paymentRequiresWaitingForPaymentStatus() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 2);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);

        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", bearer("creator", 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.currentStatus").value(2));

        verify(serviceService, never()).updateService(any(Service.class));
    }

    @Test
    void validPaymentMovesStatusFromThreeToFour() throws Exception {
        User requester = user(1, "creator");
        Service service = service(10, 1, 2, 3, 3);
        when(userService.getUserByOpenId("creator")).thenReturn(requester);
        when(serviceService.getServiceById(10)).thenReturn(service);
        when(serviceService.updateService(any(Service.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/services/payment/10")
                        .header("Authorization", bearer("creator", 0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(serviceService).updateService(service);
        org.junit.jupiter.api.Assertions.assertEquals(4, service.getServiceStatus());
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
