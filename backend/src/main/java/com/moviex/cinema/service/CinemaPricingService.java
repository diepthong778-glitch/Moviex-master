package com.moviex.cinema.service;

import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.BookingPriceLine;
import com.moviex.cinema.model.BookingPricingBreakdown;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class CinemaPricingService {
    @Value("${cinema.pricing.vip-surcharge:25000}")
    private BigDecimal vipSurcharge;

    @Value("${cinema.pricing.couple-multiplier:2}")
    private BigDecimal coupleMultiplier;

    @Value("${cinema.pricing.couple-surcharge:0}")
    private BigDecimal coupleSurcharge;

    public BookingPricingBreakdown buildBreakdown(ShowtimeViewResponse showtime, List<Seat> seats) {
        return buildBreakdownInternal(showtime, seats == null ? List.of() : seats.stream()
                .map(this::toPricingSeat)
                .toList());
    }

    public BookingPricingBreakdown buildBreakdownFromBooking(ShowtimeViewResponse showtime, List<BookingSeat> seats) {
        return buildBreakdownInternal(showtime, seats == null ? List.of() : seats.stream()
                .map(this::toPricingSeat)
                .toList());
    }

    private BookingPricingBreakdown buildBreakdownInternal(ShowtimeViewResponse showtime, List<PricingSeat> seats) {
        BookingPricingBreakdown breakdown = new BookingPricingBreakdown();
        if (showtime != null) {
            breakdown.setMovieId(showtime.getMovieId());
            breakdown.setMovieTitle(showtime.getMovieTitle());
            breakdown.setCinemaId(showtime.getCinemaId());
            breakdown.setCinemaName(showtime.getCinemaName());
            breakdown.setAuditoriumId(showtime.getAuditoriumId());
            breakdown.setAuditoriumName(showtime.getAuditoriumName());
            breakdown.setShowtimeId(showtime.getId());
            breakdown.setShowDate(showtime.getShowDate());
            breakdown.setStartTime(showtime.getStartTime());
            breakdown.setEndTime(showtime.getEndTime());
            breakdown.setBasePrice(normalizeMoney(showtime.getBasePrice()));
        }

        breakdown.setVipSurcharge(normalizeMoney(vipSurcharge));
        breakdown.setCoupleMultiplier(normalizeMoney(coupleMultiplier));
        breakdown.setCoupleSurcharge(normalizeMoney(coupleSurcharge));

        List<BookingPriceLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal basePrice = breakdown.getBasePrice();

        for (PricingSeat pricingSeat : seats) {
            SeatType normalizedType = normalizeSeatType(pricingSeat.type());
            BigDecimal unitPrice = calculateUnitPrice(basePrice, normalizedType);
            String rule = pricingRuleLabel(normalizedType);

            BookingPriceLine line = new BookingPriceLine();
            line.setSeatId(pricingSeat.seatId());
            line.setSeatLabel(pricingSeat.label());
            line.setRow(pricingSeat.row());
            line.setNumber(pricingSeat.number());
            line.setSeatType(normalizedType);
            line.setPricingRule(rule);
            line.setUnitPrice(unitPrice);
            line.setLineTotal(unitPrice);
            lines.add(line);
            subtotal = subtotal.add(unitPrice);
        }

        breakdown.setSeats(lines);
        breakdown.setSubtotal(subtotal);
        breakdown.setTotal(subtotal);
        return breakdown;
    }

    private BigDecimal calculateUnitPrice(BigDecimal basePrice, SeatType seatType) {
        BigDecimal normalizedBase = normalizeMoney(basePrice);
        return switch (seatType) {
            case VIP -> normalizedBase.add(normalizeMoney(vipSurcharge));
            case COUPLE -> normalizedBase
                    .multiply(normalizeMoney(coupleMultiplier))
                    .add(normalizeMoney(coupleSurcharge))
                    .setScale(0, RoundingMode.HALF_UP);
            default -> normalizedBase;
        };
    }

    private SeatType normalizeSeatType(SeatType seatType) {
        if (seatType == null) {
            return SeatType.NORMAL;
        }
        return seatType == SeatType.STANDARD ? SeatType.NORMAL : seatType;
    }

    private String pricingRuleLabel(SeatType seatType) {
        return switch (seatType) {
            case VIP -> "VIP surcharge";
            case COUPLE -> "Couple pair price";
            default -> "Base price";
        };
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value.setScale(0, RoundingMode.HALF_UP);
    }

    private PricingSeat toPricingSeat(Seat seat) {
        return new PricingSeat(
                seat.getId(),
                seat.getRow(),
                seat.getNumber(),
                seat.getType()
        );
    }

    private PricingSeat toPricingSeat(BookingSeat seat) {
        return new PricingSeat(
                seat.getSeatId(),
                seat.getRow(),
                seat.getNumber(),
                seat.getType()
        );
    }

    private record PricingSeat(String seatId, String row, Integer number, SeatType type) {
        private String label() {
            String safeRow = row == null ? "" : row.trim().toUpperCase(Locale.ROOT);
            return safeRow + (number == null ? "" : number);
        }
    }
}
