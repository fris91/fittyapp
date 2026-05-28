package com.fitty.auth.service;

import com.fitty.auth.domain.Account;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final SecretKey key;
    private final String issuer;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;

    public JwtService(
            @Value("${fitty.jwt.secret}") String secret,
            @Value("${fitty.jwt.issuer}") String issuer,
            @Value("${fitty.jwt.access-token-minutes}") long accessTokenMinutes,
            @Value("${fitty.jwt.refresh-token-days}") long refreshTokenDays
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
    }

    public String accessToken(Account account) {
        Instant expiresAt = Instant.now().plus(accessTokenMinutes, ChronoUnit.MINUTES);
        return token(account, expiresAt, Map.of("typ", "access", "email", account.getEmail()));
    }

    public String refreshToken(Account account) {
        Instant expiresAt = Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS);
        return token(account, expiresAt, Map.of("typ", "refresh", "email", account.getEmail()));
    }

    public Instant accessTokenExpiresAt() {
        return Instant.now().plus(accessTokenMinutes, ChronoUnit.MINUTES);
    }

    private String token(Account account, Instant expiresAt, Map<String, Object> claims) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(account.getId().toString())
                .claims(claims)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }
}
