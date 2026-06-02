package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service,Integer> {
    List<Service> findByCreatorId(Integer creatorId);
    List<Service> findByTargetId(Integer targetId);
    List<Service> findByProviderId(Integer providerId);
    Service findByServiceId(Integer serviceId);
    Page<Service> findByServiceStatus(Integer status, Pageable pageable);
    Page<Service> findByCreatorIdOrTargetId(Integer creatorId, Integer targetId, Pageable pageable);
    List<Service> findByCreatorIdOrTargetId(Integer creatorId, Integer targetId);
}
