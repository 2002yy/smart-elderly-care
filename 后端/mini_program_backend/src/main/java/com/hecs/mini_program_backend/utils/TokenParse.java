package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.Data;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Data
public class TokenParse {
    private final String signature = "com.hecs.mini_program_backend.utils";
    private String openid;
    private Integer userType;
    private Date expiration;

    public void parseToken(String token){
        Date now = new Date();

        // Create a proper key from the signature string
        SecretKey key = Keys.hmacShaKeyFor(signature.getBytes(StandardCharsets.UTF_8));
        
        JwtParser jwtParser = Jwts.parserBuilder().setSigningKey(key).build();
        Jws<Claims> jwsClaims = jwtParser.parseClaimsJws(token);
        Claims claims = jwsClaims.getBody();

        expiration = claims.getExpiration();
        if (expiration.before(now)) {
            throw new JwtException("Token has expired");
        }

        openid = claims.get("openid").toString();
        // user_type可能不存在，所以这里不强制解析
        if (claims.get("user_type") != null) {
            userType = Integer.parseInt(claims.get("user_type").toString());
        }
    }
}
