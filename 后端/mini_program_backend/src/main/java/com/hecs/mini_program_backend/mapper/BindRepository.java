package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.Bind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BindRepository extends JpaRepository<Bind,Integer> {
    List<Bind> findByElderId(Integer elderId);
    List<Bind> findByGuardianId(Integer guardianId);
    List<Bind> findByElderIdAndGuardianId(Integer elderId, Integer guardianId);
    Bind findByBindId(Integer bindId);
}
