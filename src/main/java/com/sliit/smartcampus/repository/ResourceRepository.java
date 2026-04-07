package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ResourceRepository extends JpaRepository<Resource, Long>, JpaSpecificationExecutor<Resource> {
    boolean existsByResourceCode(String resourceCode);
    boolean existsByResourceCodeAndIdNot(String resourceCode, Long id);
    Optional<Resource> findByResourceCode(String resourceCode);
}