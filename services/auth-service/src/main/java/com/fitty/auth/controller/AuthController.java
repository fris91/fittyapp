package com.fitty.auth.controller;

import com.fitty.auth.dto.AuthDtos.LoginRequest;
import com.fitty.auth.dto.AuthDtos.OAuthPlaceholderResponse;
import com.fitty.auth.dto.AuthDtos.RefreshRequest;
import com.fitty.auth.dto.AuthDtos.RegisterRequest;
import com.fitty.auth.dto.AuthDtos.TokenResponse;
import com.fitty.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public TokenResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.accepted().body(Map.of("status", "placeholder", "message", "Refresh token rotation is planned"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.accepted().body(Map.of("status", "revoked"));
    }

    @GetMapping("/oauth2/{provider}")
    public OAuthPlaceholderResponse oauthPlaceholder(@PathVariable String provider) {
        return new OAuthPlaceholderResponse(provider, "placeholder", "Configure OAuth2 client registration before using this provider");
    }
}
