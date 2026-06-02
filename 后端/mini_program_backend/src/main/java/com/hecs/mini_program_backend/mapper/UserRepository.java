package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User,Integer> {
    User findByOpenId(String openId);
    User findUserById(Integer id);
    User findByPhoneNumber(String phoneNumber);
}
