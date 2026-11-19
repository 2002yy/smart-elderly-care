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
    List<Service> findByCreatorId(Integer creatorId);
    List<Service> findByTargetId(Integer targetId);
    List<Service> findByProviderId(Integer providerId);
    Service findByServiceId(Integer serviceId);
    Page<Service> findByServiceStatus(Integer status, Pageable pageable);
    Page<Service> findByCreatorIdOrTargetId(Integer creatorId, Integer targetId, Pageable pageable);
    @Query("SELECT s FROM Service s WHERE (s.creatorId = :userId OR s.targetId = :userId) AND s.serviceStatus IN :statuses")
    Page<Service> findVisibleByStatuses(@Param("userId") Integer userId,
                                       @Param("statuses") List<Integer> statuses, Pageable pageable);
    List<Service> findByCreatorIdOrTargetId(Integer creatorId, Integer targetId);

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
