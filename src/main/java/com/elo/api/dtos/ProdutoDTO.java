package com.elo.api.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ProdutoDTO {

    private Integer produtoId;

    @NotNull(message = "empresa_id é obrigatório")
    private Integer empresaId;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @NotNull(message = "Valor é obrigatório")
    private BigDecimal valor;

    @NotNull(message = "Valor custo é obrigatório")
    private BigDecimal valorCusto;

    @NotNull(message = "Quantidade é obrigatória")
    private Integer quantidade;

    private String tipoComercializacao;
    private String tipoProduto;
    private List<Integer> empresasAutorizadas;
    private String imagemBase64;
    private List<String> fotosSecundarias;
}
