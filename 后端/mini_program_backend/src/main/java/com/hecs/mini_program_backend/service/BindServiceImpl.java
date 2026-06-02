package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Bind;
import com.hecs.mini_program_backend.mapper.BindRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;

@org.springframework.stereotype.Service
public class BindServiceImpl implements BindService {

    @Autowired
    BindRepository bindRepository;

    @Override
    public List<Bind> getBindByElderId(Integer elderId) {
        return bindRepository.findByElderId(elderId);
    }

    @Override
    public List<Bind> getBindByGuardianId(Integer guardianId) {
        return bindRepository.findByGuardianId(guardianId);
    }
    
    @Override
    public List<Bind> getBindingsByElderAndGuardianId(Integer elderId, Integer guardianId) {
        return bindRepository.findByElderIdAndGuardianId(elderId, guardianId);
    }
    
    @Override
    public Bind getBindById(Integer bindId) {
        return bindRepository.findByBindId(bindId);
    }
    
    @Override
    public Bind createBind(Bind bind) {
        bind.setCreateTime(Instant.now());
        bind.setUpdateTime(Instant.now());
        bind.setBindStatus(1); // 待确认状态
        return bindRepository.save(bind);
    }
    
    @Override
    public Bind updateBind(Bind bind) {
        bind.setUpdateTime(Instant.now());
        return bindRepository.save(bind);
    }
    
    @Override
    public void deleteBind(Integer bindId) {
        bindRepository.deleteById(bindId);
    }
}
