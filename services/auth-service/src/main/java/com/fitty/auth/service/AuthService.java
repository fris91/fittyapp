package com.fitty.auth.service;

import com.fitty.auth.domain.Account;
import com.fitty.auth.dto.AuthDtos.LoginRequest;
import com.fitty.auth.dto.AuthDtos.RegisterRequest;
import com.fitty.auth.dto.AuthDtos.TokenResponse;
import com.fitty.auth.repository.AccountRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {
    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AuthService(AccountRepository accounts, PasswordEncoder passwordEncoder, JwtService jwtService, KafkaTemplate<String, Object> kafkaTemplate) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (accounts.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        Account account = new Account(
                UUID.randomUUID(),
                request.email().toLowerCase(),
                passwordEncoder.encode(request.password()),
                request.displayName(),
                Instant.now()
        );
        accounts.save(account);
        kafkaTemplate.send("user-registered", account.getId().toString(), Map.of(
                "eventId", UUID.randomUUID().toString(),
                "type", "user-registered",
                "occurredAt", Instant.now().toString(),
                "userId", account.getId().toString(),
                "email", account.getEmail(),
                "displayName", account.getDisplayName()
        ));
        return tokenResponse(account);
    }

    public TokenResponse login(LoginRequest request) {
        Account account = accounts.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        return tokenResponse(account);
    }

    private TokenResponse tokenResponse(Account account) {
        return new TokenResponse(
                account.getId(),
                account.getEmail(),
                account.getDisplayName(),
                jwtService.accessToken(account),
                jwtService.refreshToken(account),
                jwtService.accessTokenExpiresAt()
        );
    }
}
