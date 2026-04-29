package com.moviex.ai.service;

import com.moviex.cinema.dto.SeatAvailabilityResponse;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.SeatAvailabilityStatus;
import com.moviex.cinema.model.SeatType;
import com.moviex.cinema.service.SeatService;
import com.moviex.cinema.service.ShowtimeService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiCinemaAdapterService {
    private final ShowtimeService showtimeService;
    private final SeatService seatService;

    public AiCinemaAdapterService(ShowtimeService showtimeService, SeatService seatService) {
        this.showtimeService = showtimeService;
        this.seatService = seatService;
    }

    public List<ShowtimeViewResponse> listTonightShowtimes(int limit) {
        LocalDate today = LocalDate.now();
        LocalTime eveningStart = LocalTime.of(17, 0);

        List<ShowtimeViewResponse> showtimes = showtimeService.listShowtimeViews(null, null, null, today, null).stream()
                .filter(showtime -> showtime.getStartTime() != null && !showtime.getStartTime().isBefore(eveningStart))
                .sorted(Comparator.comparing(ShowtimeViewResponse::getStartTime))
                .limit(limit)
                .toList();

        if (!showtimes.isEmpty()) {
            return showtimes;
        }

        LocalTime now = LocalTime.now();
        return showtimeService.listShowtimeViews(null, null, null, today, null).stream()
                .filter(showtime -> showtime.getStartTime() != null && !showtime.getStartTime().isBefore(now))
                .sorted(Comparator.comparing(ShowtimeViewResponse::getStartTime))
                .limit(limit)
                .toList();
    }

    public List<SeatPairRecommendation> recommendSeatPairs(String showtimeId, int limit) {
        List<SeatAvailabilityResponse> availability = seatService.listSeatAvailability(showtimeId);
        List<SeatAvailabilityResponse> availableSeats = availability.stream()
                .filter(seat -> seat.getStatus() == SeatAvailabilityStatus.AVAILABLE)
                .sorted(Comparator
                        .comparing(SeatAvailabilityResponse::getRow, Comparator.nullsLast(String::compareTo))
                        .thenComparing(SeatAvailabilityResponse::getNumber, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        if (availableSeats.isEmpty()) {
            return List.of();
        }

        Map<String, List<SeatAvailabilityResponse>> byRow = availableSeats.stream()
                .collect(Collectors.groupingBy(
                        seat -> String.valueOf(seat.getRow()),
                        Collectors.collectingAndThen(Collectors.toList(), seats -> seats.stream()
                                .sorted(Comparator.comparing(SeatAvailabilityResponse::getNumber))
                                .toList())
                ));

        List<String> orderedRows = byRow.keySet().stream().sorted(String::compareTo).toList();
        double idealRowIndex = orderedRows.isEmpty() ? 0 : (orderedRows.size() - 1) * 0.55;
        List<SeatPairRecommendation> recommendations = new ArrayList<>();

        for (int rowIndex = 0; rowIndex < orderedRows.size(); rowIndex += 1) {
            String rowKey = orderedRows.get(rowIndex);
            List<SeatAvailabilityResponse> rowSeats = byRow.getOrDefault(rowKey, List.of());
            int rowCenterNumber = rowSeats.isEmpty() ? 0 : rowSeats.get(rowSeats.size() / 2).getNumber();

            for (int index = 0; index < rowSeats.size() - 1; index += 1) {
                SeatAvailabilityResponse left = rowSeats.get(index);
                SeatAvailabilityResponse right = rowSeats.get(index + 1);
                if (left.getNumber() == null || right.getNumber() == null) {
                    continue;
                }
                if (right.getNumber() - left.getNumber() != 1) {
                    continue;
                }

                double rowDistance = Math.abs(rowIndex - idealRowIndex);
                double centerDistance = Math.abs(((left.getNumber() + right.getNumber()) / 2.0) - rowCenterNumber);
                double typeBonus = 0;
                if (left.getType() == SeatType.COUPLE && right.getType() == SeatType.COUPLE) {
                    typeBonus = -0.8;
                } else if (left.getType() == SeatType.VIP && right.getType() == SeatType.VIP) {
                    typeBonus = -0.25;
                }

                double score = rowDistance + (centerDistance / 3.0) + typeBonus;
                recommendations.add(new SeatPairRecommendation(left, right, score));
            }
        }

        return recommendations.stream()
                .sorted(Comparator.comparingDouble(SeatPairRecommendation::score))
                .limit(limit)
                .toList();
    }

    public String describeSeatType(SeatType type, boolean vietnamese) {
        if (type == null) {
            return vietnamese ? "Thuong" : "Standard";
        }
        return switch (type) {
            case COUPLE -> vietnamese ? "Doi" : "Couple";
            case VIP -> "VIP";
            case STANDARD, NORMAL -> vietnamese ? "Thuong" : "Standard";
        };
    }

    public String buildSeatLabel(SeatAvailabilityResponse seat) {
        return String.format(Locale.ROOT, "%s%d", seat.getRow(), seat.getNumber());
    }

    public record SeatPairRecommendation(
            SeatAvailabilityResponse left,
            SeatAvailabilityResponse right,
            double score
    ) {
    }
}
