package com.example.newsportal.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.newsportal.firebase.FirebaseNewsGateway;
import com.example.newsportal.model.NewsArticle;

@Service
public class MockNewsService implements NewsService {

    private final FirebaseNewsGateway firebaseNewsGateway;

    public MockNewsService(FirebaseNewsGateway firebaseNewsGateway) {
        this.firebaseNewsGateway = firebaseNewsGateway;
    }

    @Override
    public List<NewsArticle> getLatestNews() {
        firebaseNewsGateway.recordFeedRequest("top-headlines");

        return List.of(
            new NewsArticle(
                1L,
                "Breaking: Spring Boot Monolith Launches",
                "The new News Portal boilerplate is now serving API and frontend from a single deployable unit.",
                LocalDate.of(2026, 5, 16)
            ),
            new NewsArticle(
                2L,
                "Frontend Build Integrated Into Backend",
                "React and Vite assets are compiled first and copied directly into Spring Boot static resources.",
                LocalDate.of(2026, 5, 15)
            ),
            new NewsArticle(
                3L,
                "Container Deployment Simplified",
                "A three-stage Docker build produces an optimized runtime image for container-based hosting.",
                LocalDate.of(2026, 5, 14)
            )
        );
    }
}
