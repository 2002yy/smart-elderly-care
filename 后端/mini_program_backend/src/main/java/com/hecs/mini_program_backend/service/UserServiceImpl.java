package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.mapper.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;

@org.springframework.stereotype.Service
public class UserServiceImpl implements UserService {

    @Autowired
    UserRepository userRepository;

    @Override
    public User getUserByOpenId(String openId) {
        return userRepository.findByOpenId(openId);
    }
    
    @Override
    public User getUserById(Integer id) {
        return userRepository.findUserById(id);
    }

    @Override
    public User getUserByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber);
    }

    @Override
    public void insertUser(String openId) {
        User user = new User();
        user.setOpenId(openId);
        user.setUserType(99); // 未注册
        userRepository.save(user);
    }
    
    @Override
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
