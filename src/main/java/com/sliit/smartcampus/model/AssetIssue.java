package com.sliit.smartcampus.model;

import com.sliit.smartcampus.enums.IssueSeverity;
import com.sliit.smartcampus.enums.IssueStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetIssue {
    private String id;
    private String text;
    private IssueSeverity severity;
    private LocalDate date;
    private IssueStatus status;
}
