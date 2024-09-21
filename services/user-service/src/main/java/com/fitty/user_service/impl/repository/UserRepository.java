package com.fitty.user_service.impl.repository;

import com.fitty.user_service.impl.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<UserEntity,String> {
}
