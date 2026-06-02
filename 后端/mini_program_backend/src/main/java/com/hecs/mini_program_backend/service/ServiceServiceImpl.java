package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;

@org.springframework.stereotype.Service
public class ServiceServiceImpl implements ServiceService {
    private static final Logger logger = LoggerFactory.getLogger(ServiceServiceImpl.class);

    @Autowired
    private ServiceRepository serviceRepository;

    @Override
    public List<Service> getServiceByObjectId(Integer objectId) {
        try {
            if (objectId == null) {
                logger.warn("Null objectId provided to getServiceByObjectId");
                return Collections.emptyList();
            }
            return serviceRepository.findByTargetId(objectId);
        } catch (Exception e) {
            logger.error("Error fetching services by objectId: {}", objectId, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<Service> getServiceByCreatorId(Integer creatorId) {
        try {
            if (creatorId == null) {
                logger.warn("Null creatorId provided to getServiceByCreatorId");
                return Collections.emptyList();
            }
            return serviceRepository.findByCreatorId(creatorId);
        } catch (Exception e) {
            logger.error("Error fetching services by creatorId: {}", creatorId, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<Service> getServiceByEmployeeId(Integer employeeId) {
        try {
            if (employeeId == null) {
                logger.warn("Null employeeId provided to getServiceByEmployeeId");
                return Collections.emptyList();
            }
            return serviceRepository.findByProviderId(employeeId);
        } catch (Exception e) {
            logger.error("Error fetching services by employeeId: {}", employeeId, e);
            return Collections.emptyList();
        }
    }
    
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
    public Page<Service> getServicesByStatus(Integer status, Pageable pageable) {
        try {
            return serviceRepository.findByServiceStatus(status, pageable);
        } catch (Exception e) {
            logger.error("Error fetching services by status: {}", status, e);
            throw e;
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
    public void deleteService(Integer serviceId) {
        try {
            if (serviceId == null) {
                logger.warn("Null serviceId provided to deleteService");
                return;
            }
            serviceRepository.deleteById(serviceId);
        } catch (Exception e) {
            logger.error("Error deleting service with id: {}", serviceId, e);
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
            return serviceRepository.findByCreatorIdOrTargetId(userId, userId, pageable);
        } catch (Exception e) {
            logger.error("Error fetching services for user: {}", userId, e);
            throw e;
        }
    }

    @Override
    public List<Service> getServicesForUser(Integer userId) {
        try {
            if (userId == null) {
                logger.warn("Null userId provided to getServicesForUser");
                return Collections.emptyList();
            }
            return serviceRepository.findByCreatorIdOrTargetId(userId, userId);
        } catch (Exception e) {
            logger.error("Error fetching services for user: {}", userId, e);
            return Collections.emptyList();
        }
    }
}
