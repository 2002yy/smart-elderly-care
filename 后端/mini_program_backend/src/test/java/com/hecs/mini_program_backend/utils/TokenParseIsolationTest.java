package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenParseIsolationTest {

    @Test
    void concurrentRequestsKeepTheirOwnVerifiedIdentity() throws Exception {
        TokenGenerate generator = new TokenGenerate();
        String elderToken = generator.TokenGenerate("elder-A", 0);
        String guardianToken = generator.TokenGenerate("guardian-B", 1);
        CountDownLatch bothParsed = new CountDownLatch(2);
        CountDownLatch readResults = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            Future<TokenParse.ParsedToken> elder = pool.submit(() -> {
                var parsed = TokenParse.parseToken(elderToken);
                bothParsed.countDown();
                if (!readResults.await(5, TimeUnit.SECONDS)) {
                    throw new AssertionError("Timed out waiting to read parsed identity");
                }
                return parsed;
            });
            Future<TokenParse.ParsedToken> guardian = pool.submit(() -> {
                var parsed = TokenParse.parseToken(guardianToken);
                bothParsed.countDown();
                if (!readResults.await(5, TimeUnit.SECONDS)) {
                    throw new AssertionError("Timed out waiting to read parsed identity");
                }
                return parsed;
            });

            assertTrue(bothParsed.await(5, TimeUnit.SECONDS));
            readResults.countDown();
            assertEquals("elder-A", elder.get(5, TimeUnit.SECONDS).openId());
            assertEquals(Integer.valueOf(0), elder.get().userType());
            assertEquals("guardian-B", guardian.get(5, TimeUnit.SECONDS).openId());
            assertEquals(Integer.valueOf(1), guardian.get().userType());

            // 无效请求不能通过共享状态影响已解析的用户身份。
            assertThrows(JwtException.class, () -> TokenParse.parseToken("invalid-token"));
            assertEquals("elder-A", elder.get().openId());
        } finally {
            readResults.countDown();
            pool.shutdownNow();
        }
    }
}
