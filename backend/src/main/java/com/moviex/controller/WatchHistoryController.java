package com.moviex.controller;

import com.moviex.dto.WatchHistoryResponse;
import com.moviex.dto.WatchHistorySaveRequest;
import com.moviex.dto.MessageResponse;
import com.moviex.service.WatchHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class WatchHistoryController {

    private final WatchHistoryService watchHistoryService;

    public WatchHistoryController(WatchHistoryService watchHistoryService) {
        this.watchHistoryService = watchHistoryService;
    }

    @PostMapping("/save")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<WatchHistoryResponse> saveHistory(@RequestBody WatchHistorySaveRequest request) {
        return ResponseEntity.ok(watchHistoryService.saveWhenWatch(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<WatchHistoryResponse>> getHistory(
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(watchHistoryService.getUserHistory(limit));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<WatchHistoryResponse>> getMyHistory(
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(watchHistoryService.getUserHistory(limit));
    }

    @DeleteMapping("/me/{movieId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> deleteMyHistory(@PathVariable String movieId) {
        watchHistoryService.deleteUserHistoryItem(movieId);
        return ResponseEntity.ok(new MessageResponse("History entry deleted."));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<WatchHistoryResponse>> getAllHistory(
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(watchHistoryService.adminGetAllHistory(limit));
    }
}
