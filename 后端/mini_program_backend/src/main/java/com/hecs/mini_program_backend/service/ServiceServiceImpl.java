package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@org.springframework.stereotype.Service
public class ServiceServiceImpl implements ServiceService {
    private static final Logger logger = LoggerFactory.getLogger(ServiceServiceImpl.class);

    @Autowired
    private ServiceRepository serviceRepository;

    @Override
    public Service getServiceById(Integer serviceId) {
        try {
            if (serviceId == null) {
                logger.warn("Null serviceId provided to getServiceById");
                return null;
            }
            return serviceRepository.findByServiceId(serviceId);
        } catch (Exception e) {
            logger.error("Error fetching service by id: {}", serviceId, e);
            return null;
        }
    }
    
    @Override
    public Service createService(Service service) {
        try {
            // No need to manually set timestamps due to @CreationTimestamp and @UpdateTimestamp
            if (service.getServiceStatus() == null) {
                service.setServiceStatus(0); // Default status is 'pending'
            }
            return serviceRepository.save(service);
        } catch (Exception e) {
            logger.error("Error creating service", e);
            throw e;
        }
    }
    
    @Override
    public Service updateService(Service service) {
        try {
            // No need to manually set update timestamp due to @UpdateTimestamp
            return serviceRepository.save(service);
        } catch (Exception e) {
            logger.error("Error updating service", e);
            throw e;
        }
    }
    
    @Override
    public Page<Service> getServicesForUser(Integer userId, Pageable pageable) {
        try {
            if (userId == null) {
                logger.warn("Null userId provided to getServicesForUser");
                return Page.empty(pageable);
            }
            return serviceRepository.findAccessibleToCustomer(userId, pageable);
        } catch (Exception e) {
            logger.error("Error fetching services for user: {}", userId, e);
            throw e;
        }
    }

    @Override
    public Page<Service> getServicesForUserByStatuses(Integer userId, List<Integer> statuses, Pageable pageable) {
        if (userId == null || statuses == null || statuses.isEmpty()) {
            return Page.empty(pageable);
        }
        return serviceRepository.findVisibleByStatuses(userId, statuses, pageable);
    }

}
