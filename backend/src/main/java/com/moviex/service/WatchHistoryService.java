package com.moviex.service;

import com.moviex.dto.WatchHistoryResponse;
import com.moviex.dto.WatchHistorySaveRequest;

import java.util.List;

public interface WatchHistoryService {
    WatchHistoryResponse saveProgress(WatchHistorySaveRequest request);
    List<WatchHistoryResponse> getHistory();
    WatchHistoryResponse saveWhenWatch(WatchHistorySaveRequest request);
    List<WatchHistoryResponse> getUserHistory();
    List<WatchHistoryResponse> getUserHistory(int limit);
    void deleteUserHistoryItem(String movieId);
    List<WatchHistoryResponse> adminGetAllHistory();
    List<WatchHistoryResponse> adminGetAllHistory(int limit);
}
