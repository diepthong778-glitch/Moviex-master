package com.moviex.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;
    private final String frontendBaseUrl;
    private final String mailFrom;
    private final String mailHost;
    private final int mailPort;
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    public EmailService(
        JavaMailSender javaMailSender,
        @Value("${moviex.app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl,
        @Value("${spring.mail.username:no-reply@moviex.local}") String mailFrom,
        @Value("${spring.mail.host:}") String mailHost,
        @Value("${spring.mail.port:0}") int mailPort
    ) {
        this.javaMailSender = javaMailSender;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
        this.mailFrom = (mailFrom == null || mailFrom.isBlank()) ? "no-reply@moviex.local" : mailFrom;
        this.mailHost = mailHost;
        this.mailPort = mailPort;
    }

    @Async("mailTaskExecutor")
    public void sendVerificationEmail(String toEmail, String token) {
        logger.info("Sending verification email to {} via {}:{}", toEmail, mailHost, mailPort);
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(mailFrom);
            mailMessage.setTo(toEmail);
            mailMessage.setSubject("Moviex - Please Verify Your Email");

            String verificationLink = frontendBaseUrl + "/verify?token=" + token;
            mailMessage.setText("Welcome to Moviex!\n\n" +
                "Please click the link below to verify your email address:\n" +
                verificationLink + "\n\n" +
                "If you didn't request this, you can safely ignore this email.");

            javaMailSender.send(mailMessage);
            logger.info("Verification email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}", toEmail, e);
        }
    }

    @Async("mailTaskExecutor")
    public void sendTemporaryPassword(String email, String tempPassword) {
        logger.info("Sending temporary password email to {} via {}:{}", email, mailHost, mailPort);
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(mailFrom);
            mailMessage.setTo(email);
            mailMessage.setSubject("Moviex Password Reset");
            mailMessage.setText("Your temporary password is: " + tempPassword + "\n" +
                "Please login and change your password immediately.");

            javaMailSender.send(mailMessage);
            logger.info("Temporary password email sent to: {}", email);
        } catch (Exception e) {
            logger.error("Failed to send temporary password email to {}", email, e);
        }
    }
}
