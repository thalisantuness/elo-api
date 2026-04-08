package com.elo.api.dtos;

import lombok.Data;
import java.math.BigDecimal;

/**
 * DTO para geração de QR Code (empresa → POST /api/qr-code)
 * e claim de compra (cliente → POST /api/compra).
 */
@Data
public class CompraDTO {

    // Campos para geração de QR Code
    private BigDecimal valor;
    private Integer campanhaId;

    // Campo para claim (cliente escaneia QR code)
    private String qrCodeData;
}
