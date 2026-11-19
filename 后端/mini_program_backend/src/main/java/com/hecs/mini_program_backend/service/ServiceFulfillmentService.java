package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.mapper.ServiceApplicationRepository;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@org.springframework.stereotype.Service
public class ServiceFulfillmentService {
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private ServiceApplicationRepository applicationRepository;
    @Autowired private ServiceApplicationService applicationService;

    @Transactional
    public Service start(Integer serviceId, User worker) {
        Service service = locked(serviceId);
        requireApprovedWorker(service, worker);
        requireStatus(service, 1);
        service.setServiceStartedAt(Instant.now());
        service.setServiceStatus(2);
        return serviceRepository.save(service);
    }

    @Transactional
    public Service requestCompletion(Integer serviceId, User worker) {
        Service service = locked(serviceId);
        requireApprovedWorker(service, worker);
        requireStatus(service, 2);
        if (service.getCompletionRequestedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "已提交完工声明，请等待订单当事人确认");
        }
        service.setCompletionRequestedAt(Instant.now());
        return serviceRepository.save(service);
    }

    @Transactional
    public Service confirmCompletion(Integer serviceId, User customer) {
        Service service = locked(serviceId);
        requireCustomer(service, customer);
        requireStatus(service, 2);
        if (service.getCompletionRequestedAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "员工尚未提交完工声明");
        }
        service.setCompletionConfirmedAt(Instant.now());
        service.setCompletionConfirmedBy(customer.getId());
        service.setServiceStatus(3); // 待支付，不代表已支付；原支付接口仍为 501
        return serviceRepository.save(service);
    }

    @Transactional
    public void cancelService(Integer serviceId, User customer) {
        Service service = locked(serviceId);
        requireCustomer(service, customer);
        if (!Integer.valueOf(0).equals(service.getServiceStatus())
                && !Integer.valueOf(1).equals(service.getServiceStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "履约已开始，不能硬删除订单");
        }
        // 同一行锁序列化取消与开始操作；避免删除服务后残留申请记录。
        applicationRepository.deleteAllByServiceId(serviceId);
        serviceRepository.delete(service);
    }

    private Service locked(Integer serviceId) {
        return serviceRepository.lockByServiceId(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "服务不存在"));
    }

    private void requireApprovedWorker(Service service, User user) {
        if (!applicationService.isDeclaredWorker(user)
                || !user.getId().equals(service.getProviderId())
                || !applicationService.hasApprovedAssignment(service.getServiceId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只有经批准接单的服务人员可以声明履约状态");
        }
    }

    private void requireCustomer(Service service, User user) {
        if (user == null || user.getId() == null
                || (!user.getId().equals(service.getCreatorId())
                    && !user.getId().equals(service.getTargetId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只有订单当事人可以确认或取消");
        }
    }

    private void requireStatus(Service service, int expected) {
        if (!Integer.valueOf(expected).equals(service.getServiceStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "当前状态不允许此操作");
        }
    }
}
