package com.fitty.notification.service;

import com.fitty.notification.domain.NotificationRecord;
import com.fitty.notification.repository.NotificationRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public NotificationService(NotificationRepository repository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = {"recommendation-ready", "health-risk-detected"})
    public void onDomainEvent(Map<String, Object> event) {
        NotificationRecord record = new NotificationRecord();
        record.setUserId(String.valueOf(event.getOrDefault("userId", "local-user")));
        record.setType(String.valueOf(event.getOrDefault("type", "notification")));
        record.setTitle(titleFor(record.getType()));
        record.setMessage(messageFor(record.getType()));
        record.setRead(false);
        record.setCreatedAt(Instant.now());
        NotificationRecord saved = repository.save(record);
        kafkaTemplate.send("notification-created", saved.getUserId(), Map.of(
                "eventId", UUID.randomUUID().toString(),
                "type", "notification-created",
                "occurredAt", Instant.now().toString(),
                "userId", saved.getUserId(),
                "notificationId", saved.getId(),
                "sourceType", saved.getType()
        ));
    }

    public List<NotificationRecord> list(String userId) {
        return repository.findTop100ByUserIdOrderByCreatedAtDesc(userId);
    }

    public NotificationRecord markRead(String id) {
        NotificationRecord record = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        record.setRead(true);
        return repository.save(record);
    }

    private String titleFor(String type) {
        if ("health-risk-detected".equals(type)) {
            return "Health signal needs attention";
        }
        return "New recommendation ready";
    }

    private String messageFor(String type) {
        if ("health-risk-detected".equals(type)) {
            return "Fitty noticed a value outside starter thresholds. This is not a diagnosis; consider specialist guidance if needed.";
        }
        return "Your latest wellness recommendation is available.";
    }
}
