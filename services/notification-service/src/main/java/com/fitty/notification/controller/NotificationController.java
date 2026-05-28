package com.fitty.notification.controller;

import com.fitty.notification.domain.NotificationRecord;
import com.fitty.notification.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    List<NotificationRecord> list(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId) {
        return service.list(userId);
    }

    @PatchMapping("/{id}/read")
    NotificationRecord markRead(@PathVariable String id) {
        return service.markRead(id);
    }
}
