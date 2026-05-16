package com.example.newsportal.model;

import java.time.LocalDate;

public record NewsArticle(
    Long id,
    String title,
    String content,
    LocalDate publishedDate
) {
}
