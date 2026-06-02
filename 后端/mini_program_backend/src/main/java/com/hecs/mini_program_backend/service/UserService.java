package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.User;

public interface UserService {
     User getUserByOpenId(String openId);
     User getUserById(Integer id);
     User getUserByPhoneNumber(String phoneNumber);
     void insertUser(String openId);
     User updateUser(User user);
}
