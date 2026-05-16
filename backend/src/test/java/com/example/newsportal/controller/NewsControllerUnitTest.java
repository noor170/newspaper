package com.example.newsportal.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.newsportal.model.NewsArticle;
import com.example.newsportal.service.NewsService;

@ExtendWith(MockitoExtension.class)
class NewsControllerUnitTest {

    @Mock
    private NewsService newsService;

    private NewsController newsController;

    @BeforeEach
    void setUp() {
        newsController = new NewsController(newsService);
    }

    @Test
    void getNewsReturnsArticlesFromService() {
        List<NewsArticle> expectedArticles = List.of(
            new NewsArticle(101L, "Unit Test Headline", "Unit test content", LocalDate.of(2026, 5, 16)),
            new NewsArticle(102L, "Another Headline", "More content", LocalDate.of(2026, 5, 15))
        );

        when(newsService.getLatestNews()).thenReturn(expectedArticles);

        List<NewsArticle> actualArticles = newsController.getNews();

        assertThat(actualArticles).hasSize(2);
        assertThat(actualArticles).isEqualTo(expectedArticles);
        assertThat(actualArticles.getFirst().title()).isEqualTo("Unit Test Headline");
        verify(newsService).getLatestNews();
    }
}
