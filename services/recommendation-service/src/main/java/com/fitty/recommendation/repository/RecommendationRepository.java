package com.fitty.recommendation.repository;

import com.fitty.recommendation.domain.Recommendation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RecommendationRepository extends MongoRepository<Recommendation, String> {
    Optional<Recommendation> findFirstByUserIdOrderByCreatedAtDesc(String userId);

    List<Recommendation> findTop50ByUserIdOrderByCreatedAtDesc(String userId);
}
