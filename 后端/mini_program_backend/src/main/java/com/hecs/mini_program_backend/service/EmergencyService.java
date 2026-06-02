package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Emergency;

import java.util.List;

public interface EmergencyService {
    List<Emergency> getEmergencyByUserId(Integer userId);
    Emergency getEmergencyById(Integer emergencyId);
    Emergency updateEmergency(Emergency emergency);
    Emergency createEmergency(Emergency emergency);
}
