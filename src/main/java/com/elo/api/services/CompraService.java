package com.elo.api.services;

import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.models.Compra;
import com.elo.api.models.Regra;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.CompraRepository;
import com.elo.api.repositories.RegraRepository;
import com.elo.api.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompraService {

    private final CompraRepository compraRepository;
    private final UsuarioRepository usuarioRepository;
    private final RegraRepository regraRepository;
    private final QRCodeUtils qrCodeUtils;

    @Transactional
    public Compra gerarQRCode(BigDecimal valor, Integer campanhaId, Integer empresaId) {
        if (empresaId == null) throw new IllegalArgumentException("empresaId não pode ser nulo");
        Usuario empresa = usuarioRepository.findById(empresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        String qrCodeId = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiraEm = LocalDateTime.now().plusMinutes(15);

        // Calcular pontos baseado na regra da empresa
        int pontos = calcularPontos(empresa, valor);

        // Criar payload do QR Code
        Map<String, Object> payload = new HashMap<>();
        payload.put("qr_code_id", qrCodeId);
        payload.put("empresa_id", empresaId);
        payload.put("valor", valor.toString());
        payload.put("timestamp", System.currentTimeMillis());
        payload.put("expiresAt", expiraEm.toEpochSecond(java.time.ZoneOffset.UTC) * 1000);

        String qrCodeData = qrCodeUtils.gerarPayloadComAssinatura(payload);
        String qrCodeImage = qrCodeUtils.gerarQRCodeBase64(qrCodeData);

        Compra compra = new Compra();
        compra.setQrCodeId(qrCodeId);
        compra.setEmpresa(empresa);
        compra.setValor(valor);
        compra.setPontosAdquiridos(pontos);
        compra.setStatus(Compra.StatusCompra.pendente);
        compra.setQrCodeData(qrCodeData);
        compra.setQrCodeExpiraEm(expiraEm);

        Compra saved = compraRepository.save(compra);
        saved.setQrCodeImage(qrCodeImage);

        return saved;
    }

    private int calcularPontos(Usuario empresa, BigDecimal valor) {
        Integer regraId = empresa.getRegraId();
        if (regraId != null) {
            Regra regra = regraRepository.findById(regraId).orElse(null);
            if (regra != null && regra.getAtiva()) {
                if (valor.compareTo(regra.getValorMinimo()) >= 0) {
                    if (regra.getTipo() == Regra.TipoRegra.por_compra) {
                        return regra.getPontos();
                    } else if (regra.getTipo() == Regra.TipoRegra.por_valor) {
                        return valor.multiply(regra.getMultiplicador()).intValue();
                    }
                } else {
                    return 0; // Abaixo do valor mínimo
                }
            }
        }
        // Fallback: 1 ponto por real
        return valor.intValue();
    }

    @Transactional
    public Compra claimCompra(String qrCodeData, Integer clienteId) {
        // Validar e decodificar QR Code
        Map<String, Object> payload = qrCodeUtils.validarQRCode(qrCodeData);

        if (payload == null || !Boolean.TRUE.equals(payload.get("valid"))) {
            throw new RuntimeException("QR Code inválido ou expirado");
        }

        String qrCodeId = (String) payload.get("qr_code_id");

        // Buscar compra pendente
        Compra compra = compraRepository.findByQrCodeId(qrCodeId)
                .orElseThrow(() -> new RuntimeException("Compra não encontrada"));

        if (compra.getStatus() != Compra.StatusCompra.pendente) {
            throw new RuntimeException("Compra já foi processada");
        }

        if (compra.getQrCodeExpiraEm().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("QR Code expirado");
        }

        if (clienteId == null) throw new IllegalArgumentException("clienteId não pode ser nulo");
        Usuario cliente = usuarioRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));

        // Claim da compra
        compra.setCliente(cliente);
        compra.setStatus(Compra.StatusCompra.validada);
        compra.setValidadoEm(LocalDateTime.now());
        compra.setValidadoPor(cliente);

        // Adicionar pontos ao cliente
        cliente.setPontos(cliente.getPontos() + compra.getPontosAdquiridos());
        usuarioRepository.save(cliente);

        return compraRepository.save(compra);
    }

    public List<Compra> listarComprasPorEmpresa(Integer empresaId) {
        return compraRepository.findByEmpresaUsuarioId(empresaId);
    }

    public List<Compra> listarComprasPorCliente(Integer clienteId) {
        return compraRepository.findByClienteUsuarioId(clienteId);
    }

    public Map<String, Object> getEstatisticasEmpresa(Integer empresaId) {
        long totalCompras = compraRepository.countComprasValidadasByEmpresa(empresaId);
        Double totalVendido = compraRepository.sumValorValidadasByEmpresa(empresaId);
        Long totalPontos = compraRepository.sumPontosValidadasByEmpresa(empresaId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("total_compras", totalCompras);
        stats.put("total_vendido", totalVendido != null ? totalVendido : 0.0);
        stats.put("total_pontos_distribuidos", totalPontos != null ? totalPontos : 0);

        return stats;
    }
}
