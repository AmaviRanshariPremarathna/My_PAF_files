package com.sliit.smartcampus.service.impl;

import com.sliit.smartcampus.dto.*;
import com.sliit.smartcampus.entity.Resource;
import com.sliit.smartcampus.enums.ResourceCondition;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import com.sliit.smartcampus.exception.BadRequestException;
import com.sliit.smartcampus.exception.DuplicateResourceCodeException;
import com.sliit.smartcampus.exception.ResourceNotFoundException;
import com.sliit.smartcampus.repository.ResourceRepository;
import com.sliit.smartcampus.service.ResourceService;
import com.sliit.smartcampus.specification.ResourceSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;

    @Override
    public Page<ResourceResponse> getAllResources(ResourceType type, ResourceStatus status, String building,
                                                  Integer minCapacity, String keyword,
                                                  int page, int size, String sortBy, String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<Resource> specification = Specification
                .where(ResourceSpecification.hasType(type))
                .and(ResourceSpecification.hasStatus(status))
                .and(ResourceSpecification.hasBuilding(building))
                .and(ResourceSpecification.hasMinCapacity(minCapacity))
                .and(ResourceSpecification.hasKeyword(keyword));

        return resourceRepository.findAll(specification, pageable).map(this::mapToResponse);
    }

    @Override
    public ResourceResponse getResourceById(Long id) {
        Resource resource = getResourceEntity(id);
        return mapToResponse(resource);
    }

    @Override
    public ResourceResponse createResource(ResourceCreateRequest request) {
        validateBusinessRulesForCreate(request);

        if (resourceRepository.existsByResourceCode(request.getResourceCode())) {
            throw new DuplicateResourceCodeException("Resource code already exists: " + request.getResourceCode());
        }

        Resource resource = Resource.builder()
                .resourceCode(request.getResourceCode())
                .name(request.getName())
                .description(request.getDescription())
                .resourceType(request.getResourceType())
                .category(request.getCategory())
                .capacity(request.getCapacity())
                .building(request.getBuilding())
                .floorNumber(request.getFloorNumber())
                .roomNumber(request.getRoomNumber())
                .locationText(request.getLocationText())
                .availableFrom(request.getAvailableFrom())
                .availableTo(request.getAvailableTo())
                .status(request.getStatus())
                .condition(request.getCondition())
                .borrowed(request.getBorrowed() != null ? request.getBorrowed() : false)
                .rating(request.getRating() != null ? request.getRating() : 0.0)
                .lastServiceDate(request.getLastServiceDate())
                .nextServiceDate(request.getNextServiceDate())
                .totalBookings(request.getTotalBookings() != null ? request.getTotalBookings() : 0)
                .bookingsToday(request.getBookingsToday() != null ? request.getBookingsToday() : 0)
                .amenities(safeStringList(request.getAmenities()))
                .monthlyBookings(normalizeMonthlyBookings(request.getMonthlyBookings()))
                .issues(safeIssueList(request.getIssues()))
                .imageUrl(request.getImageUrl())
                .requiresApproval(request.getRequiresApproval() != null ? request.getRequiresApproval() : false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return mapToResponse(resourceRepository.save(resource));
    }

    @Override
    public ResourceResponse updateResource(Long id, ResourceUpdateRequest request) {
        validateBusinessRulesForUpdate(request);

        Resource existing = getResourceEntity(id);

        if (resourceRepository.existsByResourceCodeAndIdNot(request.getResourceCode(), id)) {
            throw new DuplicateResourceCodeException("Resource code already exists: " + request.getResourceCode());
        }

        existing.setResourceCode(request.getResourceCode());
        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setResourceType(request.getResourceType());
        existing.setCategory(request.getCategory());
        existing.setCapacity(request.getCapacity());
        existing.setBuilding(request.getBuilding());
        existing.setFloorNumber(request.getFloorNumber());
        existing.setRoomNumber(request.getRoomNumber());
        existing.setLocationText(request.getLocationText());
        existing.setAvailableFrom(request.getAvailableFrom());
        existing.setAvailableTo(request.getAvailableTo());
        existing.setStatus(request.getStatus());
        existing.setCondition(request.getCondition());
        existing.setBorrowed(request.getBorrowed() != null ? request.getBorrowed() : false);
        existing.setRating(request.getRating() != null ? request.getRating() : 0.0);
        existing.setLastServiceDate(request.getLastServiceDate());
        existing.setNextServiceDate(request.getNextServiceDate());
        existing.setTotalBookings(request.getTotalBookings() != null ? request.getTotalBookings() : 0);
        existing.setBookingsToday(request.getBookingsToday() != null ? request.getBookingsToday() : 0);
        existing.setAmenities(safeStringList(request.getAmenities()));
        existing.setMonthlyBookings(normalizeMonthlyBookings(request.getMonthlyBookings()));
        existing.setIssues(safeIssueList(request.getIssues()));
        existing.setImageUrl(request.getImageUrl());
        existing.setRequiresApproval(request.getRequiresApproval() != null ? request.getRequiresApproval() : false);
        existing.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        return mapToResponse(resourceRepository.save(existing));
    }

    @Override
    public ResourceResponse updateStatus(Long id, ResourceStatusUpdateRequest request) {
        Resource resource = getResourceEntity(id);
        resource.setStatus(request.getStatus());
        return mapToResponse(resourceRepository.save(resource));
    }

    @Override
    public void deleteResource(Long id) {
        Resource resource = getResourceEntity(id);
        resourceRepository.delete(resource);
    }

    private Resource getResourceEntity(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    private void validateBusinessRulesForCreate(ResourceCreateRequest request) {
        validateTimeWindow(request.getAvailableFrom(), request.getAvailableTo());
        validateLocationFields(request.getResourceType(), request.getBuilding(), request.getRoomNumber());
        validateServiceDates(request.getLastServiceDate(), request.getNextServiceDate());
        validateBorrowedState(request.getStatus(), request.getBorrowed());
        validateConditionState(request.getStatus(), request.getCondition());
        validateMonthlyBookings(request.getMonthlyBookings());
    }

    private void validateBusinessRulesForUpdate(ResourceUpdateRequest request) {
        validateTimeWindow(request.getAvailableFrom(), request.getAvailableTo());
        validateLocationFields(request.getResourceType(), request.getBuilding(), request.getRoomNumber());
        validateServiceDates(request.getLastServiceDate(), request.getNextServiceDate());
        validateBorrowedState(request.getStatus(), request.getBorrowed());
        validateConditionState(request.getStatus(), request.getCondition());
        validateMonthlyBookings(request.getMonthlyBookings());
    }

    private void validateTimeWindow(java.time.LocalTime from, java.time.LocalTime to) {
        if (from != null && to != null && !from.isBefore(to)) {
            throw new BadRequestException("Available from time must be earlier than available to time");
        }
    }

    private void validateLocationFields(ResourceType type, String building, String roomNumber) {
        if (type == ResourceType.ROOM
                || type == ResourceType.LAB
                || type == ResourceType.LECTURE_HALL
                || type == ResourceType.MEETING_ROOM) {
            if (building == null || building.isBlank()) {
                throw new BadRequestException("Building is required for room-based resources");
            }
            if (roomNumber == null || roomNumber.isBlank()) {
                throw new BadRequestException("Room number is required for room-based resources");
            }
        }
    }

    private void validateServiceDates(java.time.LocalDate lastServiceDate, java.time.LocalDate nextServiceDate) {
        if (lastServiceDate != null && nextServiceDate != null && nextServiceDate.isBefore(lastServiceDate)) {
            throw new BadRequestException("Next service date must be on or after the last service date");
        }
    }

    private void validateBorrowedState(ResourceStatus status, Boolean borrowed) {
        if (Boolean.TRUE.equals(borrowed) && status != ResourceStatus.ACTIVE) {
            throw new BadRequestException("Only active resources can be marked as borrowed");
        }
    }

    private void validateConditionState(ResourceStatus status, ResourceCondition condition) {
        if (condition == ResourceCondition.REPAIR_NEEDED && status == ResourceStatus.INACTIVE) {
            throw new BadRequestException("Inactive resources cannot be marked as needing repair");
        }
    }

    private void validateMonthlyBookings(List<Integer> monthlyBookings) {
        if (monthlyBookings != null && monthlyBookings.size() != 12) {
            throw new BadRequestException("Monthly bookings must contain exactly 12 values");
        }
    }

    private List<Integer> normalizeMonthlyBookings(List<Integer> monthlyBookings) {
        if (monthlyBookings == null || monthlyBookings.isEmpty()) {
            return new ArrayList<>(java.util.Collections.nCopies(12, 0));
        }

        return new ArrayList<>(monthlyBookings);
    }

    private List<String> safeStringList(List<String> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }

    private List<com.sliit.smartcampus.model.AssetIssue> safeIssueList(List<com.sliit.smartcampus.model.AssetIssue> issues) {
        return issues == null ? new ArrayList<>() : new ArrayList<>(issues);
    }

    private ResourceResponse mapToResponse(Resource resource) {
        return ResourceResponse.builder()
                .id(resource.getId())
                .resourceCode(resource.getResourceCode())
                .name(resource.getName())
                .description(resource.getDescription())
                .resourceType(resource.getResourceType())
                .category(resource.getCategory())
                .capacity(resource.getCapacity())
                .building(resource.getBuilding())
                .floorNumber(resource.getFloorNumber())
                .roomNumber(resource.getRoomNumber())
                .locationText(resource.getLocationText())
                .availableFrom(resource.getAvailableFrom())
                .availableTo(resource.getAvailableTo())
                .status(resource.getStatus())
                .condition(resource.getCondition())
                .borrowed(resource.getBorrowed())
                .rating(resource.getRating())
                .lastServiceDate(resource.getLastServiceDate())
                .nextServiceDate(resource.getNextServiceDate())
                .totalBookings(resource.getTotalBookings())
                .bookingsToday(resource.getBookingsToday())
                .amenities(safeStringList(resource.getAmenities()))
                .monthlyBookings(normalizeMonthlyBookings(resource.getMonthlyBookings()))
                .issues(safeIssueList(resource.getIssues()))
                .imageUrl(resource.getImageUrl())
                .requiresApproval(resource.getRequiresApproval())
                .isActive(resource.getIsActive())
                .createdAt(resource.getCreatedAt())
                .updatedAt(resource.getUpdatedAt())
                .build();
    }
}
