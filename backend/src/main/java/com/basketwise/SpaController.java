package com.basketwise;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {
    @GetMapping({
        "/",
        "/catalogue",
        "/list",
        "/compare",
        "/history",
        "/feedback",
        "/admin",
        "/login"
    })
    public String index() {
        return "forward:/index.html";
    }
}
