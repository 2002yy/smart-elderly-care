package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ServiceService {
    Service getServiceById(Integer serviceId);
    Page<Service> getServicesForUser(Integer userId, Pageable pageable);
    Page<Service> getServicesForUserByStatuses(Integer userId, List<Integer> statuses, Pageable pageable);
    Service createService(Service service);
    Service updateService(Service service);
}
