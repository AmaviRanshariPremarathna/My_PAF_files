package com.sliit.smartcampus.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class IntegerListJsonConverter implements AttributeConverter<List<Integer>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<Integer>> TYPE_REFERENCE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<Integer> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to convert monthly bookings to JSON", exception);
        }
    }

    @Override
    public List<Integer> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return new ArrayList<>();
        }

        try {
            return new ArrayList<>(OBJECT_MAPPER.readValue(dbData, TYPE_REFERENCE));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to read monthly bookings from JSON", exception);
        }
    }
}
