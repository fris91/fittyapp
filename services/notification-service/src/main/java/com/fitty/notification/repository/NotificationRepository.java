package com.fitty.notification.repository;

import com.fitty.notification.domain.NotificationRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<NotificationRecord, String> {
    List<NotificationRecord> findTop100ByUserIdOrderByCreatedAtDesc(String userId);
}
