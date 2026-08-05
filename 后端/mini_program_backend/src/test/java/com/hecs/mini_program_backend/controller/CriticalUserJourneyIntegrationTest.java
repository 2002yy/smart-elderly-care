package com.hecs.mini_program_backend.controller;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
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

    @Test
    void frontendServiceCreationPersistsAndReturnsThroughListApi() throws Exception {
        User creator = saveUser("ci-creator", 1, "测试监护人");
        User target = saveUser("ci-target", 0, "测试老人");
        User provider = saveUser("ci-provider", 2, "测试服务员");
        String authorization = "Bearer " + new TokenGenerate().TokenGenerate(creator.getOpenId(), creator.getUserType());

        mockMvc.perform(post("/api/services/create")
                        .header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "targetId": %d,
                                  "providerId": %d,
                                  "type": 1,
                                  "scheduledTime": "2030-01-02T03:04:05Z",
                                  "address": "CI养老服务中心",
                                  "remark": "前端到数据库关键路径"
                                }
                                """.formatted(target.getId(), provider.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.service.creatorId").value(creator.getId()))
                .andExpect(jsonPath("$.service.targetId").value(target.getId()))
                .andExpect(jsonPath("$.service.providerId").value(provider.getId()))
                .andExpect(jsonPath("$.service.status").value(0));

        List<Service> persisted = serviceRepository.findAll();
        assertThat(persisted).hasSize(1);
        Service service = persisted.get(0);
        assertThat(service.getCreatorId()).isEqualTo(creator.getId());
        assertThat(service.getTargetId()).isEqualTo(target.getId());
        assertThat(service.getProviderId()).isEqualTo(provider.getId());
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
    void loginValidationRejectsMissingWechatCodeWithoutCallingExternalApi() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("code不能为空"));
    }

    private User saveUser(String openId, int userType, String nickname) {
        User user = new User();
        user.setOpenId(openId);
        user.setUserType(userType);
        user.setNickname(nickname);
        return userRepository.saveAndFlush(user);
    }
}
