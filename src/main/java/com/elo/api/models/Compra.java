package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "compras", schema = "public")
@Data
@NoArgsConstructor
public class Compra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "compra_id")
    private Integer compraId;

    @Column(name = "qr_code_id", unique = true, nullable = false, length = 100)
    private String qrCodeId;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Usuario cliente;

    @ManyToOne
    @JoinColumn(name = "empresa_id", nullable = false)
    private Usuario empresa;

    @ManyToOne
    @JoinColumn(name = "campanha_id")
    private Campanha campanha;

    private BigDecimal valor;

    @Column(name = "pontos_adquiridos")
    private Integer pontosAdquiridos = 0;

    @Enumerated(EnumType.STRING)
    private StatusCompra status = StatusCompra.pendente;

    @Column(name = "qr_code_data", columnDefinition = "TEXT", nullable = false)
    private String qrCodeData;

    @Column(name = "qr_code_expira_em", nullable = false)
    private LocalDateTime qrCodeExpiraEm;

    @ManyToOne
    @JoinColumn(name = "validado_por")
    private Usuario validadoPor;

    @Column(name = "validado_em")
    private LocalDateTime validadoEm;

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro = LocalDateTime.now();

    @Column(name = "data_update")
    private LocalDateTime dataUpdate;

    @Transient
    private String qrCodeImage;

    public enum StatusCompra {
        pendente, validada, cancelada, expirada
    }
}
