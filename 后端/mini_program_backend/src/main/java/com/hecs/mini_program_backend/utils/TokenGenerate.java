package com.hecs.mini_program_backend.utils;


import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;

public class TokenGenerate {
    private final long time = 1000*60*60;
    private final String signature = "com.hecs.mini_program_backend.utils";

    public String TokenGenerate(String openid){
        JwtBuilder jwtBuilder = Jwts.builder();
        // Create a proper key from the signature string
        SecretKey key = Keys.hmacShaKeyFor(signature.getBytes(StandardCharsets.UTF_8));
        
        String jwtToken = jwtBuilder
                //Header
                .setHeaderParam("typ","JWT")
                .setHeaderParam("alg","HS256")
                //payload
                .claim("openid",openid)
                .setExpiration(Date.from(Instant.now().plusMillis(time)))
                .setId(UUID.randomUUID().toString())
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        return jwtToken;
    }
    
    public String TokenGenerate(String openid, Integer userType){
        JwtBuilder jwtBuilder = Jwts.builder();
        // Create a proper key from the signature string
        SecretKey key = Keys.hmacShaKeyFor(signature.getBytes(StandardCharsets.UTF_8));
        
        String jwtToken = jwtBuilder
                //Header
                .setHeaderParam("typ","JWT")
                .setHeaderParam("alg","HS256")
                //payload
                .claim("openid",openid)
                .claim("user_type", userType)
                .setExpiration(Date.from(Instant.now().plusMillis(time)))
                .setId(UUID.randomUUID().toString())
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        return jwtToken;
    }
}
