package com.sliit.smartcampus.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sliit.smartcampus.model.AssetIssue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class AssetIssueListJsonConverter implements AttributeConverter<List<AssetIssue>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());
    private static final TypeReference<List<AssetIssue>> TYPE_REFERENCE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<AssetIssue> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to convert issues to JSON", exception);
        }
    }

    @Override
    public List<AssetIssue> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return new ArrayList<>();
        }

        try {
            return new ArrayList<>(OBJECT_MAPPER.readValue(dbData, TYPE_REFERENCE));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to read issues from JSON", exception);
        }
    }
}
