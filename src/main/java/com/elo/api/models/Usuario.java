package com.elo.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "usuarios", schema = "public")
@Data
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usuario_id")
    private Integer usuarioId;

    @Column(name = "cdl_id")
    private Integer cdlId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String nome;

    private String telefone;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Column(name = "foto_perfil")
    private String fotoPerfil;

    @Column(name = "cliente_endereco")
    private String clienteEndereco;

    private String cidade;
    private String estado;
    private Integer pontos = 0;
    private String cnpj;

    @Enumerated(EnumType.STRING)
    private StatusUsuario status = StatusUsuario.pendente;

    @Column(name = "regra_id")
    private Integer regraId;

    @Column(name = "modalidade_pontuacao")
    private String modalidadePontuacao = "regras";

    @Column(name = "push_token")
    private String pushToken;

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro = LocalDateTime.now();

    @Column(name = "data_atualizacao")
    private LocalDateTime dataAtualizacao;

    /**
     * Alias para compatibilidade com controladores legados
     */
    public String getNomeCompleto() {
        return this.nome;
    }

    @OneToMany(mappedBy = "empresa")
    private List<Produto> produtos = new ArrayList<>();

    @OneToMany(mappedBy = "usuario")
    private List<Recompensa> recompensas = new ArrayList<>();

    public enum Role {
        admin, cdl, empresa, cliente, empresa_funcionario
    }

    public enum StatusUsuario {
        ativo, pendente, bloqueado
    }
}
