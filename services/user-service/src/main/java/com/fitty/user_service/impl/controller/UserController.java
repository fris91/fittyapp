package com.fitty.user_service.impl.controller;

import com.fitty.user_service.api.dto.UserRequest;
import com.fitty.user_service.api.dto.UserResponse;
import com.fitty.user_service.impl.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user-service")
@RequiredArgsConstructor
public class UserController {
    private final UserService service;

    @PostMapping
    public ResponseEntity<String> createUser(@RequestBody @Valid UserRequest request) {
        return ResponseEntity.ok(service.createUser(request));
    }

    @PutMapping
    public ResponseEntity<String> updateUser(@RequestBody @Valid UserRequest request) {
        return ResponseEntity.ok(service.UpdateUser(request));
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> findAll() {
        return ResponseEntity.ok(service.findAllUsers());
    }

    @GetMapping("/exists/{user-id}")
    public ResponseEntity<Boolean> existsUserById(@PathVariable("user-id") String userId) {
        return ResponseEntity.ok(service.existsUserById(userId));
    }

    @GetMapping("/findUserById/{user-id}")
    public ResponseEntity<UserResponse> findUserById(@PathVariable("user-id") String userId) {
        return ResponseEntity.ok(service.findUserById(userId));
    }

    @DeleteMapping("/{user-id}")
    public ResponseEntity<?> deleteUserById(@PathVariable("user-id") String userId) {
        service.deleteUserById(userId);
        return ResponseEntity.accepted().build();
    }
}
