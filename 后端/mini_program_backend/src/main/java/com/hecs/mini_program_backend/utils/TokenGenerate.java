package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;

public class TokenGenerate {
    private final long time = 1000 * 60 * 60;

    public String TokenGenerate(String openid) {
        return buildToken(openid, null);
    }

    public String TokenGenerate(String openid, Integer userType) {
        return buildToken(openid, userType);
    }

    private String buildToken(String openid, Integer userType) {
        SecretKey key = JwtKeyProvider.signingKey();
        JwtBuilder jwtBuilder = Jwts.builder()
                .setHeaderParam("typ", "JWT")
                .setHeaderParam("alg", "HS256")
                .claim("openid", openid)
                .setExpiration(Date.from(Instant.now().plusMillis(time)))
                .setId(UUID.randomUUID().toString());

        if (userType != null) {
            jwtBuilder.claim("user_type", userType);
        }

        return jwtBuilder
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
