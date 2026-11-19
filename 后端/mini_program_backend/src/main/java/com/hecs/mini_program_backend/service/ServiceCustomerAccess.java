package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.mapper.BindRepository;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * 订单创建者不等于永久被授权人：监护人只能在与服务对象仍有有效绑定时管理订单。
 * 解除绑定不删除订单，老人本人依然可以查看历史及继续完成当前服务。
 */
@org.springframework.stereotype.Service
public class ServiceCustomerAccess {
    @Autowired private BindRepository bindRepository;

    public boolean canManageService(Service service, User user) {
        if (service == null || user == null || user.getId() == null) return false;
        if (user.getId().equals(service.getTargetId())) return true;
        return Integer.valueOf(1).equals(user.getUserType())
                && user.getId().equals(service.getCreatorId())
                && service.getTargetId() != null
                && bindRepository.existsByElderIdAndGuardianIdAndBindStatus(
                        service.getTargetId(), user.getId(), 1);
    }
}
