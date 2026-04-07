package com.sliit.smartcampus.specification;

import com.sliit.smartcampus.entity.Resource;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import org.springframework.data.jpa.domain.Specification;

public class ResourceSpecification {

    public static Specification<Resource> hasType(ResourceType type) {
        return (root, query, cb) ->
                type == null ? null : cb.equal(root.get("resourceType"), type);
    }

    public static Specification<Resource> hasStatus(ResourceStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Resource> hasBuilding(String building) {
        return (root, query, cb) ->
                (building == null || building.isBlank()) ? null :
                        cb.like(cb.lower(root.get("building")), "%" + building.toLowerCase() + "%");
    }

    public static Specification<Resource> hasMinCapacity(Integer minCapacity) {
        return (root, query, cb) ->
                minCapacity == null ? null : cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity);
    }

    public static Specification<Resource> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String like = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("resourceCode")), like),
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("locationText")), like)
            );
        };
    }
}