package com.sliit.smartcampus.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FacilitiesAssetsForwardController {

    @GetMapping({"/", "/facilities-assets", "/facilities-assets/"})
    public String facilitiesAssetsIndex() {
        return "forward:/facilities-assets/index.html";
    }
}
