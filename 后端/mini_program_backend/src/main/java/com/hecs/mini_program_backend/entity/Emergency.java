package com.hecs.mini_program_backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "emergency")
public class Emergency {

    @Id
    @Column(name = "emergency_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer emergencyId;

    @JoinColumn(name = "user_id")
    private Integer userId;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "allergies")
    private String allergies;

    @Column(name = "basic_diseases")
    private String basicDiseases;

    @Column(name = "surgery_history")
    private String surgeryHistory;

    @Column(name = "medication")
    private String medication;

    @Column(name = "emergency_notes")
    private String emergencyNotes;

}
