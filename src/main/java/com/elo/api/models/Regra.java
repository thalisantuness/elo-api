package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "regras", schema = "public")
@Data
@NoArgsConstructor
public class Regra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "regra_id")
    private Integer regraId;

    @Column(nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoRegra tipo;

    @Column(name = "valor_minimo")
    private BigDecimal valorMinimo = BigDecimal.ZERO;

    private Integer pontos = 0;
    private BigDecimal multiplicador = BigDecimal.ONE;
    private Boolean ativa = true;

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro = LocalDateTime.now();

    @Column(name = "data_update")
    private LocalDateTime dataUpdate;

    public enum TipoRegra {
        por_compra, por_valor
    }
}
