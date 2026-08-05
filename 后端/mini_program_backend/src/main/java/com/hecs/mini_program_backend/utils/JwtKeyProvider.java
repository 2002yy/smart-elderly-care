package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

final class JwtKeyProvider {
    private static final String DEVELOPMENT_FALLBACK = "com.hecs.mini_program_backend.utils";

    private JwtKeyProvider() {
    }

    static SecretKey signingKey() {
        String configured = System.getenv("JWT_SECRET");
        if (configured == null || configured.isBlank()) {
            configured = System.getProperty("jwt.secret", DEVELOPMENT_FALLBACK);
        }
        if (configured.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 characters");
        }
        return Keys.hmacShaKeyFor(configured.getBytes(StandardCharsets.UTF_8));
    }
}
