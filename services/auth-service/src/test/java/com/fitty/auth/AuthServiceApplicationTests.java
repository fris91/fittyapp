package com.fitty.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.kafka.bootstrap-servers=localhost:9092",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AuthServiceApplicationTests {
    @Test
    void contextLoads() {
    }
}
