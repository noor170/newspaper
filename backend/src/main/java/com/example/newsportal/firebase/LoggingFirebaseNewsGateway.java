package com.example.newsportal.firebase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingFirebaseNewsGateway implements FirebaseNewsGateway {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingFirebaseNewsGateway.class);

    @Override
    public void recordFeedRequest(String feedName) {
        LOGGER.info("Firebase feed request recorded for {}", feedName);
    }
}
