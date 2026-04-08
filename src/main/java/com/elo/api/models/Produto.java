package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "produtos", schema = "public")
@Data
@NoArgsConstructor
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "produto_id")
    private Integer produtoId;

    @ManyToOne
    @JoinColumn(name = "empresa_id", nullable = false)
    private Usuario empresa;

    @Column(nullable = false)
    private String nome;

    private BigDecimal valor;

    @Column(name = "valor_custo")
    private BigDecimal valorCusto;

    private Integer quantidade;

    @Column(name = "tipo_comercializacao")
    private String tipoComercializacao;

    @Column(name = "tipo_produto")
    private String tipoProduto;

    @ElementCollection
    @CollectionTable(name = "produto_empresas_autorizadas",
            joinColumns = @JoinColumn(name = "produto_id"))
    @Column(name = "empresa_id")
    private List<Integer> empresasAutorizadas = new ArrayList<>();

    @Column(name = "foto_principal")
    private String fotoPrincipal;

    @OneToMany(mappedBy = "produto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FotoProduto> fotos = new ArrayList<>();

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro = LocalDateTime.now();

    @Column(name = "data_update")
    private LocalDateTime dataUpdate;
}
