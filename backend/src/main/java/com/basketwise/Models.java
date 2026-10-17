package com.basketwise;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.time.Instant;

public final class Models {
    private Models() {}

    @MappedSuperclass
    public abstract static class Identified {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        public Long id;
    }

    @Entity
    @Table(name = "users")
    public static class User extends Identified {
        @NotBlank
        @Size(max = 80)
        public String name;

        @Email
        @NotBlank
        @Size(max = 190)
        @Column(unique = true)
        public String email;

        @JsonIgnore
        @Column(name = "password_hash")
        public String passwordHash;

        public String role = "SHOPPER";
    }

    @Entity
    @Table(name = "products")
    public static class Product extends Identified {
        @NotBlank
        @Size(max = 120)
        public String name;

        @NotBlank
        @Size(max = 80)
        public String brand;

        @NotBlank
        @Size(max = 40)
        public String packSize;

        @NotBlank
        @Size(max = 40)
        public String category;

        @NotBlank
        @Pattern(regexp = "/images/[a-z-]+\\.svg")
        public String imageUrl;

        @Min(1)
        @Max(100000000)
        public long mrp;

        public boolean active = true;
    }

    @Entity
    @Table(name = "stores")
    public static class Store extends Identified {
        @NotBlank
        @Size(max = 100)
        public String name;

        @Pattern(regexp = "ONLINE|LOCAL")
        @NotBlank
        public String type;

        @NotBlank
        @Size(max = 250)
        public String address;

        @NotBlank
        @Size(max = 200)
        public String localities;

        @Min(0)
        @Max(1000000)
        public long fee;

        @Min(1)
        @Max(1440)
        public int deliveryMinutes = 30;

        public boolean active = true;
    }

    @Entity
    @Table(
            name = "inventory",
            uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "product_id"}))
    public static class Inventory extends Identified {
        @NotNull public Long storeId;
        @NotNull public Long productId;

        @Min(0)
        @Max(100000)
        public int stock;

        @Min(1)
        @Max(100000000)
        public long regularPrice;

        @Min(1)
        @Max(100000000)
        public Long offerPrice;

        @Size(max = 160)
        public String offerText;

        public Instant offerStart;
        public Instant offerEnd;
        public Instant updatedAt = Instant.now();

        public long price(Instant now) {
            return offerPrice != null
                            && offerStart != null
                            && offerEnd != null
                            && !now.isBefore(offerStart)
                            && now.isBefore(offerEnd)
                    ? offerPrice
                    : regularPrice;
        }
    }

    @Entity
    @Table(name = "shopping_lists")
    public static class ShoppingList extends Identified {
        public Long ownerId;

        @NotBlank
        @Size(max = 100)
        public String name;

        @NotBlank
        @Size(max = 80)
        public String locality;

        @Min(0)
        @Max(1000000000)
        public Long budget;

        public Instant updatedAt = Instant.now();
    }

    @Entity
    @Table(
            name = "list_items",
            uniqueConstraints = @UniqueConstraint(columnNames = {"list_id", "product_id"}))
    public static class ListItem extends Identified {
        public Long listId;
        public Long productId;
        public int quantity;
    }

    @Entity
    @Table(name = "saved_plans")
    public static class SavedPlan extends Identified {
        public Long ownerId;
        public String name;
        public String locality;
        public Instant createdAt = Instant.now();

        @Column(columnDefinition = "LONGTEXT")
        public String snapshot;
    }

    @Entity
    @Table(name = "reviews")
    public static class Review extends Identified {
        public Long ownerId;

        @NotBlank
        @Pattern(regexp = "PRODUCT|STORE")
        public String targetType;

        @NotNull public Long targetId;

        @Min(1)
        @Max(5)
        public int rating;

        @NotBlank
        @Size(max = 1000)
        public String comment;

        public Instant createdAt = Instant.now();
    }
}
