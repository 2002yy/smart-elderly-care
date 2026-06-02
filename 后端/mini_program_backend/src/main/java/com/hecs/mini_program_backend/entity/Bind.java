package com.hecs.mini_program_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Date;

@Entity
@Data
@Table(name = "user_bind")
public class Bind {
    @Id
    @Column(name = "bind_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer bindId;

    @JoinColumn(name = "elder_id")
    private Integer elderId;

    @JoinColumn(name = "guardian_id")
    private Integer guardianId;

    @Column(name = "initiator_id")
    private Integer initiatorId;

    @JoinColumn(name = "bind_status")
    private Integer bindStatus;

    @CreationTimestamp
    @Column(name = "create_time", updatable = false)
    private Instant createTime;

    @UpdateTimestamp
    @Column(name = "update_time")
    private Instant updateTime;

}