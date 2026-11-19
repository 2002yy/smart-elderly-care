package com.hecs.mini_program_backend.service;

import com.hecs.mini_program_backend.entity.Service;
import com.hecs.mini_program_backend.entity.User;
import com.hecs.mini_program_backend.mapper.ServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

@org.springframework.stereotype.Service
public class ServiceAppointmentService {
    private static final Set<String> EDITABLE_FIELDS = Set.of("type", "scheduledTime", "address", "remark");

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private ServiceCustomerAccess customerAccess;

    @Transactional
    public Service edit(Integer serviceId, User customer, Map<String, Object> body) {
        // 与批准接单、开始服务、取消订单共用订单行锁。
        Service service = serviceRepository.lockByServiceId(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "服务不存在"));
        if (!customerAccess.canManageService(service, customer)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权修改此服务");
        }
        // 指派后的地址、时间和服务内容涉及员工已接受的订单，不能静默变更。
        if (!Integer.valueOf(0).equals(service.getServiceStatus())
                || !Integer.valueOf(0).equals(service.getProviderId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "订单已指派或开始，请取消后重新预约");
        }
        if (body == null || body.keySet().stream().anyMatch(key -> !EDITABLE_FIELDS.contains(key))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "只能修改预约类型、时间、地址和备注");
        }

        try {
            if (body.containsKey("type")) {
                int type = Integer.parseInt(String.valueOf(body.get("type")));
                if (type < 0 || type > 2) throw new NumberFormatException("type out of range");
                service.setServiceType(type);
            }
            if (body.containsKey("scheduledTime")) {
                service.setScheduledTime(Instant.parse(String.valueOf(body.get("scheduledTime"))));
            }
        } catch (NumberFormatException | DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的预约类型或时间");
        }
        if (body.containsKey("address")) {
            Object address = body.get("address");
            if (!(address instanceof String value) || value.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "服务地址不能为空");
            }
            service.setAppointedAddress(value);
        }
        if (body.containsKey("remark")) {
            Object remark = body.get("remark");
            if (!(remark instanceof String value) || value.length() > 255) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "预约备注格式或长度不正确");
            }
            service.setServiceDes(value);
        }
        return serviceRepository.save(service);
    }
}
