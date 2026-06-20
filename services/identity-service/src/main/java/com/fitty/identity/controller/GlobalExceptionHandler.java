package com.fitty.identity.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(error("validation_error", "I dati inseriti non sono validi."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(error("request_error", exception.getReason() == null ? "Richiesta non valida." : exception.getReason()));
    }

    /**
     * Errors bubbling up from Keycloak / user-service. Preserve auth-related statuses (401/403) so the
     * client can show the right message; collapse everything else to 502. Never leak the upstream body.
     */
    @ExceptionHandler(RestClientResponseException.class)
    ResponseEntity<Map<String, Object>> upstream(RestClientResponseException exception) {
        HttpStatusCode status = exception.getStatusCode();
        // Server-side only: surface the real upstream status + body so failures are diagnosable.
        log.warn("identity.upstream.error status={} body={}", status.value(), exception.getResponseBodyAsString());
        if (status.value() == 401 || status.value() == 403) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(error("invalid_credentials", "Email o password non validi."));
        }
        if (status.value() == 409) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(error("conflict", "Esiste già un account con questi dati."));
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(error("identity_provider_error", "Il servizio identità non è raggiungibile. Riprova tra poco."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> generic(Exception exception) {
        log.error("identity.unexpected.error", exception);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(error("identity_provider_error", "Si è verificato un problema. Riprova tra poco."));
    }

    private Map<String, Object> error(String code, String message) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "code", code,
                "message", message
        );
    }
}
