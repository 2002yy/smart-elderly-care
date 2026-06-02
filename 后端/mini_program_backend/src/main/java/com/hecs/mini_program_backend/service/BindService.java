package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Bind;

import java.util.List;

public interface BindService {
    List<Bind> getBindByElderId(Integer elderId);
    List<Bind> getBindByGuardianId(Integer guardianId);
    List<Bind> getBindingsByElderAndGuardianId(Integer elderId, Integer guardianId);
    Bind getBindById(Integer bindId);
    Bind createBind(Bind bind);
    Bind updateBind(Bind bind);
    void deleteBind(Integer bindId);
}
