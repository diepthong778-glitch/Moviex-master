package com.moviex.cinema.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "cinema_seat_reservations")
@CompoundIndex(name = "uniq_showtime_seat", def = "{'showtimeId': 1, 'seatId': 1}", unique = true)
public class SeatReservation {
    @Id
    private String id;
    @Indexed
    private String showtimeId;
    @Indexed
    private String bookingId;
    private String seatId;
    private SeatReservationState state = SeatReservationState.RESERVED;
    @Indexed
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public SeatReservation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public String getSeatId() { return seatId; }
    public void setSeatId(String seatId) { this.seatId = seatId; }
    public SeatReservationState getState() { return state; }
    public void setState(SeatReservationState state) { this.state = state; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
