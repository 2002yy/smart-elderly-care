package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Emergency;
import com.hecs.mini_program_backend.mapper.EmergencyRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@org.springframework.stereotype.Service
public class EmergencyServiceImpl implements EmergencyService {

    @Autowired
    EmergencyRepository emergencyRepository;

    @Override
    public List<Emergency> getEmergencyByUserId(Integer userId) {
        return emergencyRepository.findByUserId(userId);
    }
    
    @Override
    public Emergency getEmergencyById(Integer emergencyId) {
        return emergencyRepository.findByEmergencyId(emergencyId);
    }
    
    @Override
    public Emergency updateEmergency(Emergency emergency) {
        return emergencyRepository.save(emergency);
    }
    
    @Override
    public Emergency createEmergency(Emergency emergency) {
        return emergencyRepository.save(emergency);
    }
}
