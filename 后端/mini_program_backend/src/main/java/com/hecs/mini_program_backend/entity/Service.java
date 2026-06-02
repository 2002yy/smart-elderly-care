package com.hecs.mini_program_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Date;

@Data
@Entity
@Table(name = "service") // 这里的表名请根据实际数据库表名修改，假设表名为service
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "service_id")
    @EqualsAndHashCode.Include
    private Integer serviceId;

    @Column(name = "service_type")
    private Integer serviceType;

    @Column(name = "service_status")
    private Integer serviceStatus = 0; // 默认状态为0 (待处理)

    @Column(name = "service_description", length = 255)
    private String serviceDes;

    @Column(name = "creator_id", nullable = false)
    private Integer creatorId;


    @Column(name = "service_evaluation_stars")
    private Integer serviceEvaluationStars;

    @Column(name = "service_evaluation_notes", length = 255)
    private String serviceEvaluationNotes;

    @JoinColumn(name = "target_id", nullable = false)
    private Integer targetId;

    @JoinColumn(name = "provider_id", nullable = false)
    private Integer providerId;

    @Column(name = "scheduled_time")
    private Instant scheduledTime;

    @Column(name = "appointed_address")
    private String appointedAddress;

    @CreationTimestamp
    @Column(name = "create_time", updatable = false)
    private Instant createTime;

    @UpdateTimestamp
    @Column(name = "update_time")
    private Instant updateTime;

}