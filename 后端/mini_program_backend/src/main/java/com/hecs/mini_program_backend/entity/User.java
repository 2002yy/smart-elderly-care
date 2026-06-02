package com.hecs.mini_program_backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name="user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "open_id", nullable = true, length = 255) // 映射到open_id列，允许为空
    private String openId;

    @Column(name = "user_type", nullable = true) // 映射到user_type列，允许为空
    private Integer userType;

    @Column(name = "nickname", nullable = true, length = 255) // 映射到nickname列，允许为空
    private String nickname;

    @Column(name = "phone_number", nullable = true, length = 255) // 映射到phone_number列，允许为空
    private String phoneNumber;

    @Column(name = "address", nullable = true, length = 255) // 映射到address列，允许为空
    private String address;

    @Column(name = "region", nullable = true, length = 255) // 映射到region列，允许为空
    private String region;

    @Column(name = "age", nullable = true) // 映射到age列，允许为空
    private Integer age;

    @Column(name = "gender", nullable = true, length = 255) // 映射到gender列，允许为空
    private String gender;



}
