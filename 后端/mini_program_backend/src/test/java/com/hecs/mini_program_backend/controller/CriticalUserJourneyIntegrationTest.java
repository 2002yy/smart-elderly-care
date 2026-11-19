package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.entity.Bind;
import com.hecs.mini_program_backend.mapper.BindRepository;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import com.hecs.mini_program_backend.mapper.UserRepository;
import com.hecs.mini_program_backend.utils.TokenGenerate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CriticalUserJourneyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private BindRepository bindRepository;

    @Test
    void frontendServiceCreationPersistsAndReturnsThroughListApi() throws Exception {
        User creator = saveUser("ci-creator", 1, "测试监护人");
        User target = saveUser("ci-target", 0, "测试老人");
        target.setPhoneNumber("13900000001");
        userRepository.saveAndFlush(target);
        String authorization = "Bearer " + new TokenGenerate().TokenGenerate(creator.getOpenId(), creator.getUserType());

        // 真正的预约必须先由老人确认监护人绑定；申请本身不应自动生效。
        mockMvc.perform(post("/api/bindings/create")
                        .header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"target_phone\":\"13900000001\"}"))
                .andExpect(status().isCreated());
        Bind binding = bindRepository.findByElderIdAndGuardianId(target.getId(), creator.getId()).get(0);
        assertThat(binding.getBindStatus()).isEqualTo(0);

        mockMvc.perform(get("/api/bindings")
                        .header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(binding.getBindId()))
                .andExpect(jsonPath("$.data[0].partnerId").value(target.getId()));

        mockMvc.perform(put("/api/bindings/%d/status".formatted(binding.getBindId()))
                        .header("Authorization", "Bearer " + new TokenGenerate().TokenGenerate(
                                target.getOpenId(), target.getUserType()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bind_status\":1}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/services/create")
                        .header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "targetId": %d,
                                  "type": 1,
                                  "scheduledTime": "2030-01-02T03:04:05Z",
                                  "address": "CI养老服务中心",
                                  "remark": "前端到数据库关键路径"
                                }
                                """.formatted(target.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.service.creatorId").value(creator.getId()))
                .andExpect(jsonPath("$.service.targetId").value(target.getId()))
                .andExpect(jsonPath("$.service.providerId").value(0))
                .andExpect(jsonPath("$.service.status").value(0));

        List<Service> persisted = serviceRepository.findAll();
        assertThat(persisted).hasSize(1);
        Service service = persisted.get(0);
        assertThat(service.getCreatorId()).isEqualTo(creator.getId());
        assertThat(service.getTargetId()).isEqualTo(target.getId());
        assertThat(service.getProviderId()).isZero();
        assertThat(service.getAppointedAddress()).isEqualTo("CI养老服务中心");
        assertThat(service.getServiceDes()).isEqualTo("前端到数据库关键路径");

        mockMvc.perform(get("/api/services")
                        .header("Authorization", authorization)
                        .param("page", "1")
                        .param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.data[0].serviceId").value(service.getServiceId()))
                .andExpect(jsonPath("$.data[0].address").value("CI养老服务中心"));
    }

    @Test
    void unconfirmedGuardianCannotBookForElder() throws Exception {
        User guardian = saveUser("ci-unconfirmed-guardian", 1, "未获授权的监护人");
        User elder = saveUser("ci-unconfirmed-elder", 0, "未同意的老人");
        Bind pending = new Bind();
        pending.setGuardianId(guardian.getId());
        pending.setElderId(elder.getId());
        pending.setInitiatorId(guardian.getId());
        pending.setBindStatus(0);
        bindRepository.saveAndFlush(pending);

        mockMvc.perform(post("/api/services/create")
                        .header("Authorization", "Bearer " + new TokenGenerate().TokenGenerate(
                                guardian.getOpenId(), guardian.getUserType()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetId":%d,"type":1,"scheduledTime":"2030-01-02T03:04:05Z",
                                 "address":"不能代他人预约"}
                                """.formatted(elder.getId())))
                .andExpect(status().isForbidden());

        assertThat(serviceRepository.findAll()).isEmpty();
    }

    @Test
    void statusFilteredPagesReturnAllOrdersWithoutLeakingOtherUsers() throws Exception {
        User owner = saveUser("ci-paged-owner", 0, "分页测试老人");
        User other = saveUser("ci-paged-other", 0, "另一位老人");
        for (int i = 0; i < 12; i++) {
            Service service = new Service();
            service.setCreatorId(owner.getId());
            service.setTargetId(owner.getId());
            service.setProviderId(0);
            service.setServiceType(1);
            service.setServiceStatus(i == 11 ? 5 : i % 2); // 11 个待进行，1 个真正已完成
            serviceRepository.save(service);
        }
        Service unrelated = new Service();
        unrelated.setCreatorId(other.getId());
        unrelated.setTargetId(other.getId());
        unrelated.setProviderId(0);
        unrelated.setServiceStatus(0);
        unrelated.setServiceType(1);
        serviceRepository.saveAndFlush(unrelated);

        String authorization = "Bearer " + new TokenGenerate().TokenGenerate(owner.getOpenId(), owner.getUserType());
        mockMvc.perform(get("/api/services")
                        .header("Authorization", authorization)
                        .param("status", "1").param("page", "1").param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(11))
                .andExpect(jsonPath("$.data.length()").value(10));

        mockMvc.perform(get("/api/services")
                        .header("Authorization", authorization)
                        .param("status", "1").param("page", "2").param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(11))
                .andExpect(jsonPath("$.data.length()").value(1));

        mockMvc.perform(get("/api/services")
                        .header("Authorization", authorization)
                        .param("status", "5").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.data[0].status").value(5));
    }

    @Test
    void loginValidationRejectsMissingWechatCodeWithoutCallingExternalApi() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("code不能为空"));
    }

    @Test
    void emergencyHelpDoesNotClaimDeliveryWithoutARealNotificationChannel() throws Exception {
        User user = saveUser("ci-emergency", 0, "测试老人");
        String authorization = "Bearer " + new TokenGenerate().TokenGenerate(
                user.getOpenId(), user.getUserType());

        mockMvc.perform(post("/api/emergency/help")
                        .header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"location":{"latitude":39.9,"longitude":116.4},"message":"紧急求助"}
                                """))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.delivered").value(false))
                .andExpect(jsonPath("$.helpId").doesNotExist());
    }

    private User saveUser(String openId, int userType, String nickname) {
        User user = new User();
        user.setOpenId(openId);
        user.setUserType(userType);
        user.setNickname(nickname);
        return userRepository.saveAndFlush(user);
    }
}
