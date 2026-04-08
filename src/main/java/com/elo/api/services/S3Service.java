package com.elo.api.services;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.DeleteObjectRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import javax.imageio.IIOImage;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Iterator;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class S3Service {

    private final AmazonS3 amazonS3;

    @Value("${aws.bucket-name}")
    private String bucketName;

    public String uploadImagem(String base64Image, String folder) {
        try {
            // Decodificar base64
            String base64Data = base64Image.split(",")[1];
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);

            // Comprimir imagem
            byte[] compressedBytes = compressImage(imageBytes);

            // Gerar nome do arquivo
            String fileName = folder + "/" + UUID.randomUUID().toString() + ".jpg";

            // Upload para S3
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType("image/jpeg");
            metadata.setContentLength(compressedBytes.length);

            ByteArrayInputStream inputStream = new ByteArrayInputStream(compressedBytes);

            PutObjectRequest request = new PutObjectRequest(
                    bucketName, fileName, inputStream, metadata);

            amazonS3.putObject(request);

            // Retornar URL pública
            return amazonS3.getUrl(bucketName, fileName).toString();

        } catch (Exception e) {
            log.error("Erro ao fazer upload para S3", e);
            throw new RuntimeException("Falha no upload da imagem", e);
        }
    }

    private byte[] compressImage(byte[] imageBytes) throws IOException {
        // Usar ImageIO que já vem com o Java
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
        BufferedImage originalImage = ImageIO.read(inputStream);

        if (originalImage == null) {
            throw new RuntimeException("Formato de imagem inválido");
        }

        // Redimensionar se necessário
        BufferedImage resizedImage = resizeImage(originalImage, 800);

        // Comprimir
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        // Usar ImageIO para escrever como JPG com qualidade
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new RuntimeException("Nenhum escritor JPG encontrado");
        }

        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(0.8f); // 80% qualidade

        // Criar ImageOutputStream
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(resizedImage, null, null), param);
        } finally {
            writer.dispose();
        }

        return outputStream.toByteArray();
    }

    private BufferedImage resizeImage(BufferedImage originalImage, int targetWidth) {
        if (originalImage.getWidth() <= targetWidth) {
            return originalImage;
        }

        float ratio = (float) targetWidth / originalImage.getWidth();
        int targetHeight = (int) (originalImage.getHeight() * ratio);

        java.awt.Image resultingImage = originalImage.getScaledInstance(
                targetWidth, targetHeight, java.awt.Image.SCALE_SMOOTH);

        BufferedImage outputImage = new BufferedImage(
                targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);

        outputImage.getGraphics().drawImage(resultingImage, 0, 0, null);

        return outputImage;
    }

    public void deletarArquivo(String fileUrl) {
        try {
            if (fileUrl == null || !fileUrl.contains(bucketName)) {
                log.info("URL inválida ou não pertence ao bucket. Nenhuma ação de exclusão tomada.");
                return;
            }

            String key = fileUrl.split(".com/")[1];

            DeleteObjectRequest request = new DeleteObjectRequest(bucketName, key);
            amazonS3.deleteObject(request);

            log.info("Arquivo deletado do S3: {}", key);
        } catch (Exception e) {
            log.error("Erro ao deletar arquivo do S3", e);
        }
    }
}
