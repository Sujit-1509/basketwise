package com.basketwise;

import com.basketwise.Models.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

interface Users extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

interface Products extends JpaRepository<Product, Long> {}

interface Stores extends JpaRepository<Store, Long> {}

interface Inventories extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByStoreIdAndProductId(Long storeId, Long productId);
}

interface ShoppingLists extends JpaRepository<ShoppingList, Long> {
    List<ShoppingList> findByOwnerIdOrderByUpdatedAtDesc(Long id);
}

interface ListItems extends JpaRepository<ListItem, Long> {
    boolean existsByProductId(Long productId);

    List<ListItem> findByListId(Long id);

    void deleteByListId(Long id);
}

interface SavedPlans extends JpaRepository<SavedPlan, Long> {
    List<SavedPlan> findByOwnerIdOrderByCreatedAtDesc(Long id);
}

interface Reviews extends JpaRepository<Review, Long> {
    List<Review> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String type, Long id);
}
