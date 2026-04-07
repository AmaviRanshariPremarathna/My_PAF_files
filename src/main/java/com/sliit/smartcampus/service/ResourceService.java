package com.sliit.smartcampus.service;

import com.sliit.smartcampus.dto.*;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import org.springframework.data.domain.Page;

public interface ResourceService {

    Page<ResourceResponse> getAllResources(
            ResourceType type,
            ResourceStatus status,
            String building,
            Integer minCapacity,
            String keyword,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    ResourceResponse getResourceById(Long id);

    ResourceResponse createResource(ResourceCreateRequest request);

    ResourceResponse updateResource(Long id, ResourceUpdateRequest request);

    ResourceResponse updateStatus(Long id, ResourceStatusUpdateRequest request);

    void deleteResource(Long id);
}