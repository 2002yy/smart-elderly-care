package com.hecs.mini_program_backend.mapper;

import com.hecs.mini_program_backend.entity.Service;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<Service,Integer> {
    Service findByServiceId(Integer serviceId);
    // 监护关系解除后，历史订单仍属于老人，但不再向原创建监护人返回姓名/地址。
    @Query("SELECT s FROM Service s WHERE s.targetId = :userId OR "
            + "(s.creatorId = :userId AND EXISTS (SELECT b.bindId FROM Bind b "
            + "WHERE b.elderId = s.targetId AND b.guardianId = :userId AND b.bindStatus = 1))")
    Page<Service> findAccessibleToCustomer(@Param("userId") Integer userId, Pageable pageable);

    @Query("SELECT s FROM Service s WHERE (s.targetId = :userId OR "
            + "(s.creatorId = :userId AND EXISTS (SELECT b.bindId FROM Bind b "
            + "WHERE b.elderId = s.targetId AND b.guardianId = :userId AND b.bindStatus = 1))) "
            + "AND s.serviceStatus IN :statuses")
    Page<Service> findVisibleByStatuses(@Param("userId") Integer userId,
                                       @Param("statuses") List<Integer> statuses, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Service s WHERE s.serviceId = :serviceId")
    Optional<Service> lockByServiceId(@Param("serviceId") Integer serviceId);

    Page<Service> findByServiceStatusAndProviderId(Integer status, Integer providerId, Pageable pageable);

    @Query(value = "SELECT s FROM Service s WHERE s.providerId = :workerId AND s.serviceStatus IN :statuses "
            + "AND EXISTS (SELECT a.applicationId FROM ServiceApplication a WHERE a.serviceId = s.serviceId "
            + "AND a.applicantId = :workerId AND a.status = 1)",
            countQuery = "SELECT COUNT(s) FROM Service s WHERE s.providerId = :workerId AND s.serviceStatus IN :statuses "
                    + "AND EXISTS (SELECT a.applicationId FROM ServiceApplication a WHERE a.serviceId = s.serviceId "
                    + "AND a.applicantId = :workerId AND a.status = 1)")
    Page<Service> findApprovedWorkerServices(@Param("workerId") Integer workerId,
                                             @Param("statuses") List<Integer> statuses, Pageable pageable);
}
