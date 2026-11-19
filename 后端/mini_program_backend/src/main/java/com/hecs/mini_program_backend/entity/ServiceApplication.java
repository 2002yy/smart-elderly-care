package com.hecs.mini_program_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Data
@Table(name = "service_application", uniqueConstraints =
        @UniqueConstraint(columnNames = {"service_id", "applicant_id"}))
public class ServiceApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "application_id")
    private Integer applicationId;

    @Column(name = "service_id", nullable = false)
    private Integer serviceId;

    @Column(name = "applicant_id", nullable = false)
    private Integer applicantId;

    // 0: 申请中；1: 经订单当事人批准；2: 未获批准
    @Column(name = "application_status", nullable = false)
    private Integer status = 0;

    @CreationTimestamp
    @Column(name = "create_time", updatable = false)
    private Instant createTime;
}
