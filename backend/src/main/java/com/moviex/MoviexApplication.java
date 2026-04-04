package com.moviex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MoviexApplication {

    public static void main(String[] args) {
        SpringApplication.run(MoviexApplication.class, args);
    }
}
