package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;

import java.time.Instant;
import java.util.Date;

public final class TokenParse {

    private TokenParse() {
    }

    /**
     * 每次解析返回独立的不可变结果，绝不在共享 Controller 或解析器中保存请求身份。
     */
    public record ParsedToken(String openId, Integer userType, Instant expiration) {
    }

    public static ParsedToken parseToken(String token) {
        JwtParser jwtParser = Jwts.parserBuilder()
                .setSigningKey(JwtKeyProvider.signingKey())
                .build();
        Jws<Claims> jwsClaims = jwtParser.parseClaimsJws(token);
        Claims claims = jwsClaims.getBody();

        Date expiration = claims.getExpiration();
        if (expiration == null || !expiration.after(new Date())) {
            throw new JwtException("Token has expired or lacks expiration");
        }

        Object openIdClaim = claims.get("openid");
        if (openIdClaim == null) {
            throw new JwtException("Token is missing openid");
        }

        Object userTypeClaim = claims.get("user_type");
        Integer userType = userTypeClaim == null ? null : Integer.parseInt(userTypeClaim.toString());
        return new ParsedToken(openIdClaim.toString(), userType, expiration.toInstant());
    }
}
