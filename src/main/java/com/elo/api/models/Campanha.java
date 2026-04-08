package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "campanhas", schema = "public")
@Data
@NoArgsConstructor
public class Campanha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "campanha_id")
    private Integer campanhaId;

    @ManyToOne
    @JoinColumn(name = "empresa_id", nullable = false)
    private Usuario empresa;

    @Column(nullable = false, length = 100)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "imagem_url")
    private String imagemUrl;

    @ElementCollection
    @CollectionTable(name = "campanha_produtos",
            joinColumns = @JoinColumn(name = "campanha_id"))
    @Column(name = "produto_id")
    private List<Integer> produtos = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "campanha_recompensas",
            joinColumns = @JoinColumn(name = "campanha_id"))
    @Column(name = "recom_id")
    private List<Integer> recompensas = new ArrayList<>();

    @Column(name = "data_inicio", nullable = false)
    private LocalDateTime dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDateTime dataFim;

    private Boolean ativa = true;

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro = LocalDateTime.now();

    @Column(name = "data_update")
    private LocalDateTime dataUpdate;
}
