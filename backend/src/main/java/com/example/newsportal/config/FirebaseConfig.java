package com.example.newsportal.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirebaseConfig.class);
    private static final String FIREBASE_CREDENTIALS_ENV = "FIREBASE_CREDENTIALS";

    @PostConstruct
    public void initFirebase() {
        if (!FirebaseApp.getApps().isEmpty()) {
            LOGGER.info("FirebaseApp already initialized. Reusing existing instance.");
            return;
        }

        String rawJsonEnv = System.getenv(FIREBASE_CREDENTIALS_ENV);
        if (rawJsonEnv == null || rawJsonEnv.trim().isEmpty()) {
            LOGGER.error("CRITICAL: FIREBASE_CREDENTIALS environment variable is completely missing.");
            return;
        }

        try (InputStream serviceAccount =
                 new ByteArrayInputStream(rawJsonEnv.getBytes(StandardCharsets.UTF_8))) {
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);
            LOGGER.info("Firebase successfully initialized inside container via environment memory.");
        } catch (IOException exception) {
            LOGGER.error("Failed to initialize Firebase Admin SDK.", exception);
        }
    }
}
