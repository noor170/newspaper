package com.example.newsportal.service;

import java.util.List;

import com.example.newsportal.model.NewsArticle;

public interface NewsService {

    List<NewsArticle> getLatestNews();
}
