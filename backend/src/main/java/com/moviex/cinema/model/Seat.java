package com.moviex.cinema.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "cinema_seats")
@CompoundIndex(name = "auditorium_row_number_idx", def = "{'auditoriumId': 1, 'row': 1, 'number': 1}", unique = true)
public class Seat {
    @Id
    private String id;
    @Indexed
    private String cinemaId;
    @Indexed
    private String auditoriumId;
    private String row;
    private int number;
    private SeatType type = SeatType.NORMAL;
    private SeatStatus status = SeatStatus.AVAILABLE;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Seat() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getAuditoriumId() { return auditoriumId; }
    public void setAuditoriumId(String auditoriumId) { this.auditoriumId = auditoriumId; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
    public SeatType getType() { return type; }
    public void setType(SeatType type) { this.type = type; }
    public SeatStatus getStatus() { return status; }
    public void setStatus(SeatStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
