package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.enums.ResourceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private ResourceStatus status;
}