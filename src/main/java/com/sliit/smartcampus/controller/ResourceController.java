package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.dto.*;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import com.sliit.smartcampus.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ResponseEntity<Page<ResourceResponse>> getAllResources(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) String building,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        return ResponseEntity.ok(
                resourceService.getAllResources(type, status, building, minCapacity, keyword, page, size, sortBy, sortDir)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @PostMapping
    public ResponseEntity<ResourceResponse> createResource(@Valid @RequestBody ResourceCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createResource(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResourceResponse> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody ResourceUpdateRequest request
    ) {
        return ResponseEntity.ok(resourceService.updateResource(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ResourceResponse> updateResourceStatus(
            @PathVariable Long id,
            @Valid @RequestBody ResourceStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(resourceService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
