package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.ServiceApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceApplicationRepository extends JpaRepository<ServiceApplication, Integer> {
    ServiceApplication findByServiceIdAndApplicantId(Integer serviceId, Integer applicantId);
    List<ServiceApplication> findByServiceIdOrderByApplicationIdAsc(Integer serviceId);
    boolean existsByServiceIdAndApplicantIdAndStatus(Integer serviceId, Integer applicantId, Integer status);
}
