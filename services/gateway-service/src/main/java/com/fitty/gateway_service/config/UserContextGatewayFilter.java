package com.fitty.gateway_service.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.stream.Collectors;

@Component
public class UserContextGatewayFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return exchange.getPrincipal()
                .cast(Authentication.class)
                .map(authentication -> withUserHeaders(exchange, authentication))
                .defaultIfEmpty(exchange)
                .flatMap(chain::filter);
    }

    private ServerWebExchange withUserHeaders(ServerWebExchange exchange, Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            return exchange;
        }
        Jwt jwt = jwtAuthentication.getToken();
        String roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.replace("ROLE_", ""))
                .collect(Collectors.joining(","));
        return exchange.mutate()
                .request(exchange.getRequest().mutate()
                        .headers(headers -> {
                            headers.set("X-User-Id", jwt.getSubject());
                            headers.set("X-User-Email", valueOrEmpty(jwt.getClaimAsString("email")));
                            headers.set("X-User-Roles", roles);
                        })
                        .build())
                .build();
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    @Override
    public int getOrder() {
        return -50;
    }
}
