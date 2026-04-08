package com.moviex.cinema.dto;

public class AdminSeatLayoutGenerateRequest {
    private String rows;
    private Integer seatsPerRow;
    private String vipRows;
    private String coupleRows;

    public AdminSeatLayoutGenerateRequest() {}

    public String getRows() { return rows; }
    public void setRows(String rows) { this.rows = rows; }
    public Integer getSeatsPerRow() { return seatsPerRow; }
    public void setSeatsPerRow(Integer seatsPerRow) { this.seatsPerRow = seatsPerRow; }
    public String getVipRows() { return vipRows; }
    public void setVipRows(String vipRows) { this.vipRows = vipRows; }
    public String getCoupleRows() { return coupleRows; }
    public void setCoupleRows(String coupleRows) { this.coupleRows = coupleRows; }
}
