package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ServiceService {
    List<Service> getServiceByObjectId(Integer objectId);
    List<Service> getServiceByCreatorId(Integer creatorId);
    List<Service> getServiceByEmployeeId(Integer employeeId);
    Service getServiceById(Integer serviceId);
    Page<Service> getServicesByStatus(Integer status, Pageable pageable);
    Page<Service> getServicesForUser(Integer userId, Pageable pageable);
    List<Service> getServicesForUser(Integer userId);
    Service createService(Service service);
    Service updateService(Service service);
    void deleteService(Integer serviceId);
}
