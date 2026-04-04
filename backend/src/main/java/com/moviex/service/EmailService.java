package com.moviex.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    
    private final JavaMailSender javaMailSender;
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendVerificationEmail(String toEmail, String token) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom("yourgmail@gmail.com");
            mailMessage.setTo(toEmail);
            mailMessage.setSubject("Moviex - Please Verify Your Email");
            
            // Link back to frontend
            String verificationLink = "http://localhost:3000/verify?token=" + token;
            
            mailMessage.setText("Welcome to Moviex!\n\n" +
                    "Please click the link below to verify your email address:\n" +
                    verificationLink + "\n\n" +
                    "If you didn't request this, you can safely ignore this email.");
            
            javaMailSender.send(mailMessage);
            logger.info("✅ Verification email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.error("❌ Failed to send email to {}: {}", toEmail, e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendTemporaryPassword(String email, String tempPassword) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom("yourgmail@gmail.com");
            mailMessage.setTo(email);
            mailMessage.setSubject("Moviex Password Reset");
            mailMessage.setText("Your temporary password is: " + tempPassword + "\n"
                    + "Please login and change your password immediately.");

            javaMailSender.send(mailMessage);
            logger.info("Temporary password email sent to: {}", email);
        } catch (Exception e) {
            logger.error("Failed to send temporary password email to {}: {}", email, e.getMessage());
            e.printStackTrace();
        }
    }
}
