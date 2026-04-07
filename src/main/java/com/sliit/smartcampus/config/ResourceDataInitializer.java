package com.sliit.smartcampus.config;

import com.sliit.smartcampus.entity.Resource;
import com.sliit.smartcampus.enums.IssueSeverity;
import com.sliit.smartcampus.enums.IssueStatus;
import com.sliit.smartcampus.enums.ResourceCondition;
import com.sliit.smartcampus.enums.ResourceStatus;
import com.sliit.smartcampus.enums.ResourceType;
import com.sliit.smartcampus.model.AssetIssue;
import com.sliit.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class ResourceDataInitializer {

    private final ResourceRepository resourceRepository;

    @Bean
    CommandLineRunner seedResources() {
        return args -> {
            if (resourceRepository.count() > 0) {
                return;
            }

            LocalDate today = LocalDate.now();

            resourceRepository.saveAll(List.of(
                    resource("A001", "Epson 4K Projector", ResourceType.EQUIPMENT, "Projector", 1, "Block A", 1, "101",
                            "Block A · Room 101", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 4.3,
                            today.minusDays(14), today.plusDays(76), 143, 9,
                            List.of(12, 18, 15, 22, 19, 25, 28, 21, 16, 24, 18, 20),
                            List.of("4K Laser", "HDMI", "Remote", "Carry Case"), List.of(),
                            "High-brightness 4K laser projector ideal for large halls."),
                    resource("A002", "Lecture Hall A101", ResourceType.LECTURE_HALL, "Hall", 120, "Block A", 1, "A101",
                            "Block A · Floor 1", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 4.7,
                            today.minusDays(30), today.plusDays(60), 312, 14,
                            List.of(28, 32, 29, 38, 35, 41, 44, 37, 30, 39, 33, 36),
                            List.of("Projector", "Mic System", "AC", "WiFi", "Tiered Seating"), List.of(),
                            "Large lecture hall with 4K laser projector and wireless mic."),
                    resource("A003", "Sony FX3 Camera", ResourceType.EQUIPMENT, "Camera", 1, "Block D", 1, "STORE-2",
                            "Media Store · Block D", ResourceStatus.ACTIVE, ResourceCondition.GOOD, true, 4.9,
                            today.minusDays(7), today.plusDays(83), 76, 4,
                            List.of(4, 8, 6, 9, 7, 10, 11, 8, 5, 9, 7, 8),
                            List.of("Lenses", "Tripod", "Hard Case", "ND Filters"), List.of(),
                            "Full-frame cinema-line camera for media production."),
                    resource("A004", "Computer Lab 3B", ResourceType.LAB, "Lab", 40, "Block B", 3, "3B",
                            "Block B · Floor 3", ResourceStatus.ACTIVE, ResourceCondition.REPAIR_NEEDED, false, 4.5,
                            today.minusDays(60), today.plusDays(30), 189, 11,
                            List.of(16, 19, 17, 22, 20, 24, 26, 21, 17, 23, 19, 21),
                            List.of("40 PCs", "AC", "WiFi", "Printer"),
                            List.of(issue("I001", "3 workstations have keyboard issues", IssueSeverity.MEDIUM, today.minusDays(3), IssueStatus.OPEN)),
                            "40 high-spec workstations running Ubuntu and Windows dual boot."),
                    resource("A005", "DJI Mavic 3 Drone", ResourceType.EQUIPMENT, "Drone", 1, "Block D", 1, "STORE-4",
                            "Media Store · Block D", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 5.0,
                            today.minusDays(5), today.plusDays(85), 34, 2,
                            List.of(1, 3, 2, 4, 3, 5, 6, 4, 2, 4, 3, 4),
                            List.of("3 Batteries", "ND Filters", "Controller", "Hard Case"), List.of(),
                            "Aerial photography drone with controller and accessories."),
                    resource("A006", "Meeting Room M2", ResourceType.MEETING_ROOM, "Room", 12, "Block C", 2, "M2",
                            "Block C · Floor 2", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 4.8,
                            today.minusDays(20), today.plusDays(70), 421, 18,
                            List.of(35, 40, 37, 45, 42, 50, 54, 47, 38, 48, 41, 44),
                            List.of("Smart Board", "Video Conf", "AC", "WiFi"), List.of(),
                            "Air-conditioned room with smart whiteboard and Zoom setup."),
                    resource("A007", "Robotics Lab", ResourceType.LAB, "Lab", 20, "Block E", 1, "R-LAB",
                            "Block E · Floor 1", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 4.7,
                            today.minusDays(10), today.plusDays(80), 98, 6,
                            List.of(7, 9, 8, 11, 10, 13, 14, 11, 8, 12, 10, 11),
                            List.of("Robotic Arms", "3D Printer", "IoT Kits", "WiFi"), List.of(),
                            "Robotic arms, IoT kits, and 3D printers."),
                    resource("A008", "Dell Laptop Set (x5)", ResourceType.EQUIPMENT, "Laptop", 5, "Block B", 1, "EQ-7",
                            "Equipment Store · B", ResourceStatus.OUT_OF_SERVICE, ResourceCondition.REPAIR_NEEDED, false, 3.8,
                            today.minusDays(90), today.plusDays(10), 67, 0,
                            List.of(5, 7, 6, 8, 7, 9, 10, 8, 5, 8, 7, 7),
                            List.of("Chargers", "Bags", "Mouse"),
                            List.of(issue("I002", "Battery drain issues on 2 units", IssueSeverity.HIGH, today.minusDays(5), IssueStatus.IN_PROGRESS)),
                            "5 Dell laptops for group presentations and fieldwork."),
                    resource("A009", "Board Room VIP", ResourceType.MEETING_ROOM, "Room", 20, "Admin Block", 3, "VIP",
                            "Admin Block · Floor 3", ResourceStatus.ACTIVE, ResourceCondition.GOOD, false, 4.9,
                            today.minusDays(25), today.plusDays(65), 156, 5,
                            List.of(12, 15, 13, 18, 16, 20, 22, 18, 13, 19, 16, 17),
                            List.of("Premium AV", "Video Conf", "Catering", "AC", "Motorized Blinds"), List.of(),
                            "Executive boardroom with premium AV and catering access."),
                    resource("A010", "Canon EOS R5", ResourceType.EQUIPMENT, "Camera", 1, "Block D", 1, "STORE-3",
                            "Media Store · Block D", ResourceStatus.ACTIVE, ResourceCondition.GOOD, true, 4.8,
                            today.minusDays(3), today.plusDays(87), 52, 3,
                            List.of(3, 5, 4, 6, 5, 7, 8, 6, 4, 6, 5, 6),
                            List.of("50mm Lens", "70-200mm Lens", "Tripod", "Flash"), List.of(),
                            "45MP mirrorless camera for professional photography.")
            ));
        };
    }

    private Resource resource(
            String code,
            String name,
            ResourceType type,
            String category,
            int capacity,
            String building,
            int floor,
            String room,
            String locationText,
            ResourceStatus status,
            ResourceCondition condition,
            boolean borrowed,
            double rating,
            LocalDate lastServiceDate,
            LocalDate nextServiceDate,
            int totalBookings,
            int bookingsToday,
            List<Integer> monthlyBookings,
            List<String> amenities,
            List<AssetIssue> issues,
            String description
    ) {
        return Resource.builder()
                .resourceCode(code)
                .name(name)
                .description(description)
                .resourceType(type)
                .category(category)
                .capacity(capacity)
                .building(building)
                .floorNumber(floor)
                .roomNumber(room)
                .locationText(locationText)
                .availableFrom(LocalTime.parse("08:00"))
                .availableTo(LocalTime.parse(type == ResourceType.EQUIPMENT ? "17:00" : "20:00"))
                .status(status)
                .condition(condition)
                .borrowed(borrowed)
                .rating(rating)
                .lastServiceDate(lastServiceDate)
                .nextServiceDate(nextServiceDate)
                .totalBookings(totalBookings)
                .bookingsToday(bookingsToday)
                .monthlyBookings(monthlyBookings)
                .amenities(amenities)
                .issues(issues)
                .requiresApproval(type != ResourceType.EQUIPMENT)
                .isActive(status != ResourceStatus.INACTIVE)
                .build();
    }

    private AssetIssue issue(String id, String text, IssueSeverity severity, LocalDate date, IssueStatus status) {
        return AssetIssue.builder()
                .id(id)
                .text(text)
                .severity(severity)
                .date(date)
                .status(status)
                .build();
    }
}
