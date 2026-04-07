package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.enums.ResourceCondition;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import com.sliit.smartcampus.model.AssetIssue;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceResponse {

    private Long id;
    private String resourceCode;
    private String name;
    private String description;
    private ResourceType resourceType;
    private String category;
    private Integer capacity;
    private String building;
    private Integer floorNumber;
    private String roomNumber;
    private String locationText;
    private LocalTime availableFrom;
    private LocalTime availableTo;
    private ResourceStatus status;
    private ResourceCondition condition;
    private Boolean borrowed;
    private Double rating;
    private LocalDate lastServiceDate;
    private LocalDate nextServiceDate;
    private Integer totalBookings;
    private Integer bookingsToday;
    private List<String> amenities;
    private List<Integer> monthlyBookings;
    private List<AssetIssue> issues;
    private String imageUrl;
    private Boolean requiresApproval;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
