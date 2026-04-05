package com.moviex.service.payment;

import com.moviex.model.PaymentProviderType;
import com.moviex.model.PaymentTransaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SandboxQrPaymentProvider implements PaymentProvider {
    private final String frontendBaseUrl;
    private final String receiverName;
    private final String receiverAccount;
    private final String bankName;
    private final String currency;

    public SandboxQrPaymentProvider(
            @Value("${moviex.payment.sandbox.frontend-base-url}") String frontendBaseUrl,
            @Value("${moviex.payment.sandbox.receiver-name}") String receiverName,
            @Value("${moviex.payment.sandbox.receiver-account}") String receiverAccount,
            @Value("${moviex.payment.sandbox.bank-name}") String bankName,
            @Value("${moviex.payment.sandbox.currency:VND}") String currency) {
        this.frontendBaseUrl = frontendBaseUrl;
        this.receiverName = receiverName;
        this.receiverAccount = receiverAccount;
        this.bankName = bankName;
        this.currency = currency;
    }

    @Override
    public PaymentProviderType getProviderType() {
        return PaymentProviderType.SANDBOX_QR;
    }

    @Override
    public PaymentTransaction initialize(PaymentTransaction transaction) {
        transaction.setProvider(getProviderType());
        transaction.setReceiverName(receiverName);
        transaction.setReceiverAccount(receiverAccount);
        transaction.setBankName(bankName);
        if (transaction.getCurrency() == null || transaction.getCurrency().isBlank()) {
            transaction.setCurrency(currency);
        }
        transaction.setQrPayloadUrl(
                String.format("%s/payment-sandbox/%s", frontendBaseUrl.replaceAll("/+$", ""), transaction.getTxnCode())
        );
        return transaction;
    }
}
