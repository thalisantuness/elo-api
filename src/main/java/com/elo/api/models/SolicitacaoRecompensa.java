package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitacao_recompensas", schema = "public")
@Data
@NoArgsConstructor
public class SolicitacaoRecompensa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "solicitacao_id")
    private Integer solicitacaoId;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "recom_id", nullable = false)
    private Recompensa recompensa;

    @Enumerated(EnumType.STRING)
    private StatusSolicitacao status = StatusSolicitacao.pendente;

    @Column(name = "data_solicitacao")
    private LocalDateTime dataSolicitacao = LocalDateTime.now();

    @Column(name = "data_resposta")
    private LocalDateTime dataResposta;

    public enum StatusSolicitacao {
        pendente, aceita, rejeitada
    }
}
