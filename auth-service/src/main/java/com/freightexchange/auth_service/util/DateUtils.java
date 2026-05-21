package com.freightexchange.auth_service.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

public class DateUtils {

    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    public static Instant nowInstant() {
        return Instant.now();
    }

    public static LocalDateTime fromEpochMillis(long millis) {
        return Instant.ofEpochMilli(millis)
                .atZone(ZoneOffset.UTC)
                .toLocalDateTime();
    }

    public static long toEpochMillis(LocalDateTime time) {
        return time.toInstant(ZoneOffset.UTC).toEpochMilli();
    }
}