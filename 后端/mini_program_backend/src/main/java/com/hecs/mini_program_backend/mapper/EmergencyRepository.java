package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.Emergency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyRepository extends JpaRepository<Emergency,Integer> {
    List<Emergency> findByUserId(Integer userId);
    Emergency findByEmergencyId(Integer emergencyId);
}
