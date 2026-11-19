package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.ServiceApplication;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.mapper.ServiceApplicationRepository;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@org.springframework.stereotype.Service
public class ServiceApplicationService {
    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ServiceApplicationRepository applicationRepository;

    @Autowired
    private UserService userService;

    public boolean isDeclaredWorker(User user) {
        return user != null && user.getId() != null && user.getUserType() != null
                && user.getUserType() >= 2 && user.getUserType() <= 4;
    }

    @Transactional(readOnly = true)
    public Page<Service> available(Pageable pageable) {
        return serviceRepository.findByServiceStatusAndProviderId(0, 0, pageable);
    }

    @Transactional
    public ServiceApplication apply(Integer serviceId, User worker) {
        requireWorker(worker);
        Service service = lockService(serviceId);
        if (!Integer.valueOf(0).equals(service.getServiceStatus())
                || !Integer.valueOf(0).equals(service.getProviderId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "订单已不接受接单申请");
        }
        ServiceApplication existing = applicationRepository.findByServiceIdAndApplicantId(serviceId, worker.getId());
        if (existing != null) {
            if (Integer.valueOf(0).equals(existing.getStatus())) return existing;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "当前申请已处理");
        }
        ServiceApplication application = new ServiceApplication();
        application.setServiceId(serviceId);
        application.setApplicantId(worker.getId());
        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public List<ServiceApplication> applications(Integer serviceId, User customer) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "服务不存在"));
        requireEditor(service, customer);
        return applicationRepository.findByServiceIdOrderByApplicationIdAsc(serviceId);
    }

    @Transactional
    public Service approve(Integer serviceId, Integer applicationId, User customer) {
        Service service = lockService(serviceId);
        requireEditor(service, customer);
        if (!Integer.valueOf(0).equals(service.getServiceStatus())
                || !Integer.valueOf(0).equals(service.getProviderId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "订单已被分配");
        }
        ServiceApplication chosen = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "申请不存在"));
        if (!serviceId.equals(chosen.getServiceId()) || !Integer.valueOf(0).equals(chosen.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "申请不属于本订单或已处理");
        }
        User worker = userService.getUserById(chosen.getApplicantId());
        requireWorker(worker);

        for (ServiceApplication application : applicationRepository.findByServiceIdOrderByApplicationIdAsc(serviceId)) {
            if (Integer.valueOf(0).equals(application.getStatus())) {
                application.setStatus(application.getApplicationId().equals(applicationId) ? 1 : 2);
                applicationRepository.save(application);
            }
        }
        service.setProviderId(worker.getId());
        service.setServiceStatus(1); // 已获订单当事人批准，待开始服务
        return serviceRepository.save(service);
    }

    @Transactional(readOnly = true)
    public boolean hasApprovedAssignment(Integer serviceId, Integer workerId) {
        return serviceId != null && workerId != null
                && applicationRepository.existsByServiceIdAndApplicantIdAndStatus(serviceId, workerId, 1);
    }

    @Transactional(readOnly = true)
    public Page<Service> assignedToWorker(Integer workerId, List<Integer> statuses, Pageable pageable) {
        return serviceRepository.findApprovedWorkerServices(workerId, statuses, pageable);
    }

    private Service lockService(Integer serviceId) {
        return serviceRepository.lockByServiceId(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "服务不存在"));
    }

    private void requireEditor(Service service, User user) {
        if (user == null || user.getId() == null || (!user.getId().equals(service.getCreatorId())
                && !user.getId().equals(service.getTargetId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权管理此服务的接单申请");
        }
    }

    private void requireWorker(User user) {
        if (!isDeclaredWorker(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅登记为服务人员的用户可申请");
        }
    }
}
