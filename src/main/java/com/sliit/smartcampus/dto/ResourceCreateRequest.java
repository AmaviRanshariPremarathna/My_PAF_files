package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.enums.ResourceCondition;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import com.sliit.smartcampus.model.AssetIssue;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceCreateRequest {

    @NotBlank(message = "Resource code is required")
    private String resourceCode;

    @NotBlank(message = "Name is required")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @NotNull(message = "Resource type is required")
    private ResourceType resourceType;

    @NotBlank(message = "Category is required")
    private String category;

    @Min(value = 0, message = "Capacity must be greater than or equal to 0")
    private Integer capacity;

    private String building;
    private Integer floorNumber;
    private String roomNumber;
    private String locationText;

    private LocalTime availableFrom;
    private LocalTime availableTo;

    @NotNull(message = "Status is required")
    private ResourceStatus status;

    @NotNull(message = "Condition is required")
    private ResourceCondition condition;

    private Boolean borrowed;

    @DecimalMin(value = "0.0", message = "Rating must be at least 0")
    @DecimalMax(value = "5.0", message = "Rating must be at most 5")
    private Double rating;

    private LocalDate lastServiceDate;
    private LocalDate nextServiceDate;

    @Min(value = 0, message = "Total bookings must be greater than or equal to 0")
    private Integer totalBookings;

    @Min(value = 0, message = "Today's bookings must be greater than or equal to 0")
    private Integer bookingsToday;

    private List<String> amenities;
    private List<Integer> monthlyBookings;
    private List<AssetIssue> issues;

    private String imageUrl;
    private Boolean requiresApproval;
    private Boolean isActive;
}
