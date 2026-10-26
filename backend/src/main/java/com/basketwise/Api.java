package com.basketwise;

import com.basketwise.ComparisonEngine.Result;
import com.basketwise.GroceryService.*;
import com.basketwise.Models.*;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** HTTP contracts only; business rules and transactions belong to GroceryService. */
@RestController
@RequestMapping("/api")
public class Api {
    private final GroceryService service;

    Api(GroceryService service) {
        this.service = service;
    }

    @GetMapping("/auth/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return service.csrf(token);
    }

    @GetMapping("/auth/me")
    Me me(Authentication auth) {
        return service.me(auth);
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    UserView register(@Valid @RequestBody Registration input) {
        return service.register(input);
    }

    @GetMapping("/products")
    List<Product> products(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String brand) {
        return service.products(q, brand);
    }

    @GetMapping("/stores")
    List<Store> stores(@RequestParam(defaultValue = "Kothrud") String locality) {
        return service.stores(locality);
    }

    @GetMapping("/catalog")
    Map<String, Object> catalog(@RequestParam(defaultValue = "Kothrud") String locality) {
        return service.catalog(locality);
    }

    @GetMapping("/localities")
    List<String> localities() {
        return service.localities();
    }

    @PostMapping("/comparisons")
    Result compare(@Valid @RequestBody CompareInput input) {
        return service.compare(input);
    }

    @GetMapping("/lists")
    List<ListView> lists(Authentication auth) {
        return service.lists(auth);
    }

    @PostMapping("/lists")
    @ResponseStatus(HttpStatus.CREATED)
    ListView createList(@Valid @RequestBody ListInput input, Authentication auth) {
        return service.createList(input, auth);
    }

    @GetMapping("/lists/{id}")
    ListView getList(@PathVariable Long id, Authentication auth) {
        return service.getList(id, auth);
    }

    @PatchMapping("/lists/{id}/name")
    ListView renameList(
            @PathVariable Long id, @Valid @RequestBody ListName input, Authentication auth) {
        return service.renameList(id, input, auth);
    }

    @PostMapping("/lists/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    ListView duplicateList(
            @PathVariable Long id, @Valid @RequestBody ListName input, Authentication auth) {
        return service.duplicateList(id, input, auth);
    }

    @DeleteMapping("/lists/{id}/items")
    ListView clearList(@PathVariable Long id, Authentication auth) {
        return service.clearList(id, auth);
    }

    @PostMapping("/lists/{id}/items")
    ListView addListItem(
            @PathVariable Long id, @Valid @RequestBody Line input, Authentication auth) {
        return service.addListItem(id, input, auth);
    }

    @PutMapping("/lists/{id}/items/{productId}")
    ListView setListQuantity(
            @PathVariable Long id,
            @PathVariable Long productId,
            @Valid @RequestBody Quantity input,
            Authentication auth) {
        return service.setListQuantity(id, productId, input, auth);
    }

    @DeleteMapping("/lists/{id}/items/{productId}")
    ListView removeListItem(
            @PathVariable Long id, @PathVariable Long productId, Authentication auth) {
        return service.removeListItem(id, productId, auth);
    }

    @PutMapping("/lists/{id}")
    ListView updateList(
            @PathVariable Long id, @Valid @RequestBody ListInput input, Authentication auth) {
        return service.updateList(id, input, auth);
    }

    @DeleteMapping("/lists/{id}")
    Map<String, Boolean> deleteList(@PathVariable Long id, Authentication auth) {
        return service.deleteList(id, auth);
    }

    @GetMapping("/plans")
    List<SavedPlan> plans(Authentication auth) {
        return service.plans(auth);
    }

    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    SavedPlan save(@Valid @RequestBody SaveInput input, Authentication auth) throws Exception {
        return service.save(input, auth);
    }

    @DeleteMapping("/plans/{id}")
    Map<String, Boolean> deletePlan(@PathVariable Long id, Authentication auth) {
        return service.deletePlan(id, auth);
    }

    @GetMapping("/suggestions")
    List<Map<String, Object>> suggestions(Authentication auth) throws Exception {
        return service.suggestions(auth);
    }

    @GetMapping("/reviews")
    List<ReviewView> reviews(@RequestParam String targetType, @RequestParam Long targetId) {
        return service.reviews(targetType, targetId);
    }

    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    Review addReview(@Valid @RequestBody Review input, Authentication auth) {
        return service.addReview(input, auth);
    }

    @DeleteMapping("/reviews/{id}")
    Map<String, Boolean> deleteReview(@PathVariable Long id, Authentication auth) {
        return service.deleteReview(id, auth);
    }

    @GetMapping("/admin/catalog")
    Map<String, Object> adminCatalog() {
        return service.adminCatalog();
    }

    @PostMapping("/admin/products")
    Product addProduct(@Valid @RequestBody Product input) {
        return service.addProduct(input);
    }

    @PutMapping("/admin/products/{id}")
    Product updateProduct(@PathVariable Long id, @Valid @RequestBody Product input) {
        return service.updateProduct(id, input);
    }

    @DeleteMapping("/admin/products/{id}")
    Map<String, Boolean> archiveProduct(@PathVariable Long id) {
        return service.archiveProduct(id);
    }

    @PostMapping("/admin/stores")
    Store addStore(@Valid @RequestBody Store input) {
        return service.addStore(input);
    }

    @PutMapping("/admin/stores/{id}")
    Store updateStore(@PathVariable Long id, @Valid @RequestBody Store input) {
        return service.updateStore(id, input);
    }

    @DeleteMapping("/admin/stores/{id}")
    Map<String, Boolean> archiveStore(@PathVariable Long id) {
        return service.archiveStore(id);
    }

    @PutMapping("/admin/inventory")
    Inventory inventory(@Valid @RequestBody Inventory input) {
        return service.inventory(input);
    }
}
