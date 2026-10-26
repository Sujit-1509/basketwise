package com.basketwise;

import com.basketwise.ComparisonEngine.*;
import com.basketwise.Models.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.*;

@Service
public class GroceryService {
    final Users users;
    final Products products;
    final Stores stores;
    final Inventories inventories;
    final ShoppingLists lists;
    final ListItems items;
    final SavedPlans plans;
    final Reviews reviews;
    final PasswordEncoder encoder;
    final ObjectMapper json;
    final ComparisonEngine engine = new ComparisonEngine();

    GroceryService(
            Users users,
            Products products,
            Stores stores,
            Inventories inventories,
            ShoppingLists lists,
            ListItems items,
            SavedPlans plans,
            Reviews reviews,
            PasswordEncoder encoder,
            ObjectMapper json) {
        this.users = users;
        this.products = products;
        this.stores = stores;
        this.inventories = inventories;
        this.lists = lists;
        this.items = items;
        this.plans = plans;
        this.reviews = reviews;
        this.encoder = encoder;
        this.json = json;
    }

    record Registration(
            @NotBlank @Size(max = 80) String name,
            @Email @NotBlank @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {}

    record UserView(Long id, String name, String email, String role) {}

    record Me(UserView user) {}

    record Line(@NotNull Long productId, @Min(1) @Max(999) int quantity) {}

    record ListInput(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 80) String locality,
            @Min(0) @Max(1000000000) Long budget,
            @NotNull @Size(max = 100) List<@NotNull @Valid Line> items) {}

    record ListName(@NotBlank @Size(max = 100) String name) {}

    record Quantity(@NotNull @Min(1) @Max(999) Integer quantity) {}

    record CompareInput(
            @NotBlank @Size(max = 80) String locality,
            @Min(0) @Max(1000000000) Long budget,
            @NotEmpty @Size(max = 100) List<@NotNull @Valid Line> items) {}

    record SaveInput(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Valid CompareInput request,
            @NotBlank String basketKey) {}

    record ListView(ShoppingList list, List<ListItem> items) {}

    record ReviewView(
            Long id,
            String author,
            String targetType,
            Long targetId,
            int rating,
            String comment,
            Instant createdAt) {}

    User current(Authentication auth) {
        if (auth == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in");
        return users.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    UserView view(User u) {
        return new UserView(u.id, u.name, u.email, u.role);
    }

    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    Me me(Authentication a) {
        return new Me(a == null ? null : view(current(a)));
    }

    UserView register(@Valid Registration r) {
        if (r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Password must fit within 72 UTF-8 bytes");
        String email = r.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        User u = new User();
        u.name = r.name().trim();
        u.email = email;
        u.passwordHash = encoder.encode(r.password());
        return view(users.save(u));
    }

    List<Product> products(String q, String brand) {
        String search = q.toLowerCase(Locale.ROOT);
        return products.findAll().stream()
                .filter(
                        p ->
                                p.active
                                        && (p.name + " " + p.brand + " " + p.category)
                                                .toLowerCase(Locale.ROOT)
                                                .contains(search))
                .filter(p -> brand.isBlank() || p.brand.equalsIgnoreCase(brand))
                .toList();
    }

    List<Store> stores(String locality) {
        return stores.findAll().stream().filter(s -> s.active && serves(s, locality)).toList();
    }

    boolean serves(Store s, String locality) {
        return Arrays.stream(s.localities.split(","))
                .anyMatch(l -> l.trim().equalsIgnoreCase(locality.trim()));
    }

    List<String> localities() {
        var names = new TreeMap<String, String>(String.CASE_INSENSITIVE_ORDER);
        for (String name : List.of("Kothrud", "Baner", "Viman Nagar")) names.put(name, name);
        for (var store : stores.findAll())
            if (store.active)
                for (String raw : store.localities.split(",")) {
                    String name = raw.trim();
                    if (!name.isEmpty()) names.putIfAbsent(name, name);
                }
        return List.copyOf(names.values());
    }

    Map<String, Object> catalog(String locality) {
        Instant now = Instant.now();
        var activeProducts = products("", "");
        var activeStores = stores(locality);
        Set<Long> storeIds = new HashSet<>();
        activeStores.forEach(s -> storeIds.add(s.id));
        var offers =
                inventories.findAll().stream()
                        .filter(i -> storeIds.contains(i.storeId))
                        .map(
                                i -> {
                                    Map<String, Object> row = new HashMap<>();
                                    row.put("id", i.id);
                                    row.put("productId", i.productId);
                                    row.put("storeId", i.storeId);
                                    row.put("price", i.price(now));
                                    row.put("stock", i.stock);
                                    row.put("updatedAt", i.updatedAt);
                                    row.put(
                                            "stale",
                                            i.updatedAt.isBefore(now.minus(Duration.ofHours(24))));
                                    row.put(
                                            "offerText",
                                            i.price(now) != i.regularPrice ? i.offerText : null);
                                    return row;
                                })
                        .toList();
        return Map.of(
                "products",
                activeProducts,
                "stores",
                activeStores,
                "offers",
                offers,
                "sampleData",
                true);
    }

    void validateLines(List<Line> lines) {
        if (lines.stream().map(Line::productId).distinct().count() != lines.size())
            throw new IllegalArgumentException("Combine duplicate products into one line");
        Set<Long> known = new HashSet<>();
        products.findAll().stream().filter(p -> p.active).forEach(p -> known.add(p.id));
        if (lines.stream().anyMatch(l -> !known.contains(l.productId())))
            throw new IllegalArgumentException("A product no longer exists or is inactive");
    }

    Result calculate(CompareInput input) {
        validateLines(input.items());
        Instant now = Instant.now();
        Map<Long, Product> productMap = new HashMap<>();
        products.findAll().forEach(p -> productMap.put(p.id, p));
        Map<Long, List<Inventory>> byStore = new HashMap<>();
        inventories
                .findAll()
                .forEach(i -> byStore.computeIfAbsent(i.storeId, k -> new ArrayList<>()).add(i));
        List<Shop> eligible =
                stores(input.locality()).stream()
                        .map(
                                s ->
                                        new Shop(
                                                s.id,
                                                s.name,
                                                s.type,
                                                s.fee,
                                                s.deliveryMinutes,
                                                byStore.getOrDefault(s.id, List.of()).stream()
                                                        .filter(
                                                                i ->
                                                                        productMap.containsKey(
                                                                                        i.productId)
                                                                                && productMap.get(
                                                                                                i.productId)
                                                                                        .active)
                                                        .map(
                                                                i ->
                                                                        new Offer(
                                                                                i.productId,
                                                                                i.price(now),
                                                                                productMap.get(
                                                                                                i.productId)
                                                                                        .mrp,
                                                                                i.stock,
                                                                                i.updatedAt
                                                                                        .isBefore(
                                                                                                now
                                                                                                        .minus(
                                                                                                                Duration
                                                                                                                        .ofHours(
                                                                                                                                24))),
                                                                                i.updatedAt))
                                                        .toList()))
                        .toList();
        return engine.compare(
                input.items().stream().map(i -> new Item(i.productId(), i.quantity())).toList(),
                eligible,
                input.budget());
    }

    @Transactional(readOnly = true)
    Result compare(@Valid CompareInput input) {
        return calculate(input);
    }

    @Transactional(readOnly = true)
    List<ListView> lists(Authentication auth) {
        return lists.findByOwnerIdOrderByUpdatedAtDesc(current(auth).id).stream()
                .map(l -> new ListView(l, items.findByListId(l.id)))
                .toList();
    }

    ShoppingList ownList(Long id, Authentication a) {
        return lists.findLockedByIdAndOwnerId(id, current(a).id)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "List not found"));
    }

    @Transactional(readOnly = true)
    ListView getList(Long id, Authentication a) {
        var l =
                lists.findByIdAndOwnerId(id, current(a).id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "List not found"));
        return new ListView(l, items.findByListId(id));
    }

    @Transactional
    ListView createList(@Valid ListInput input, Authentication a) {
        var l = new ShoppingList();
        l.ownerId = current(a).id;
        return writeList(l, input);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView updateList(Long id, @Valid ListInput input, Authentication a) {
        return writeList(ownList(id, a), input);
    }

    ListView writeList(ShoppingList l, ListInput input) {
        validateLines(input.items());
        l.name = input.name().trim();
        l.locality = input.locality().trim();
        l.budget = input.budget();
        l.updatedAt = Instant.now();
        lists.save(l);
        items.deleteByListId(l.id);
        items.flush();
        var lines =
                input.items().stream()
                        .map(
                                line -> {
                                    var i = new ListItem();
                                    i.listId = l.id;
                                    i.productId = line.productId();
                                    i.quantity = line.quantity();
                                    return i;
                                })
                        .toList();
        return new ListView(l, items.saveAll(lines));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    Map<String, Boolean> deleteList(Long id, Authentication a) {
        var l = ownList(id, a);
        items.deleteByListId(id);
        items.flush();
        lists.delete(l);
        return Map.of("ok", true);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView renameList(Long id, ListName input, Authentication a) {
        var l = ownList(id, a);
        l.name = input.name().trim();
        return changedList(l);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView duplicateList(Long id, ListName input, Authentication a) {
        var source = ownList(id, a);
        var copy = new ShoppingList();
        copy.ownerId = source.ownerId;
        copy.name = input.name().trim();
        copy.locality = source.locality;
        copy.budget = source.budget;
        lists.save(copy);
        for (var line : items.findByListId(source.id)) {
            var item = new ListItem();
            item.listId = copy.id;
            item.productId = line.productId;
            item.quantity = line.quantity;
            items.save(item);
        }
        return changedList(copy);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView clearList(Long id, Authentication a) {
        var l = ownList(id, a);
        items.deleteByListId(id);
        return changedList(l);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView addListItem(Long id, Line input, Authentication a) {
        var l = ownList(id, a);
        validateLines(List.of(input));
        var existing = items.findByListId(id);
        var line =
                existing.stream()
                        .filter(i -> i.productId.equals(input.productId()))
                        .findFirst()
                        .orElse(null);
        if (line == null) {
            if (existing.size() >= 100)
                throw new IllegalArgumentException(
                        "A list can contain at most 100 different products");
            line = new ListItem();
            line.listId = id;
            line.productId = input.productId();
        }
        int quantity = line.quantity + input.quantity();
        if (quantity > 999)
            throw new IllegalArgumentException("A product can have at most 999 packs");
        line.quantity = quantity;
        items.save(line);
        return changedList(l);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView setListQuantity(Long id, Long productId, Quantity input, Authentication a) {
        var l = ownList(id, a);
        var line =
                items.findByListId(id).stream()
                        .filter(i -> i.productId.equals(productId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Item not found"));
        validateLines(List.of(new Line(productId, input.quantity())));
        line.quantity = input.quantity();
        items.save(line);
        return changedList(l);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    ListView removeListItem(Long id, Long productId, Authentication a) {
        var l = ownList(id, a);
        items.findByListId(id).stream()
                .filter(i -> i.productId.equals(productId))
                .findFirst()
                .ifPresent(items::delete);
        return changedList(l);
    }

    ListView changedList(ShoppingList l) {
        l.updatedAt = Instant.now();
        lists.save(l);
        items.flush();
        return new ListView(l, items.findByListId(l.id));
    }

    List<SavedPlan> plans(Authentication a) {
        return plans.findByOwnerIdOrderByCreatedAtDesc(current(a).id);
    }

    @Transactional
    SavedPlan save(@Valid SaveInput input, Authentication a) throws Exception {
        Result result = calculate(input.request());
        var all = new ArrayList<>(result.singleStores());
        all.addAll(result.splitStores());
        Basket basket =
                all.stream()
                        .filter(b -> b.key().equals(input.basketKey()) && b.complete())
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "That complete basket is no longer available."
                                                        + " Recalculate."));
        var plan = new SavedPlan();
        plan.ownerId = current(a).id;
        plan.name = input.name();
        plan.locality = input.request().locality();
        var ids = basket.items().stream().map(Allocation::productId).toList();
        plan.snapshot =
                json.writeValueAsString(
                        Map.of(
                                "request",
                                input.request(),
                                "basket",
                                basket,
                                "products",
                                products.findAllById(ids)));
        return plans.save(plan);
    }

    Map<String, Boolean> deletePlan(Long id, Authentication a) {
        var p =
                plans.findById(id)
                        .filter(x -> x.ownerId.equals(current(a).id))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Plan not found"));
        plans.delete(p);
        return Map.of("ok", true);
    }

    List<Map<String, Object>> suggestions(Authentication a) throws Exception {
        var counts = new HashMap<Long, Integer>();
        for (var plan : plans.findByOwnerIdOrderByCreatedAtDesc(current(a).id)) {
            for (var line : json.readTree(plan.snapshot).path("request").path("items"))
                counts.merge(line.path("productId").asLong(), 1, Integer::sum);
        }
        Map<Long, Product> active = new HashMap<>();
        products.findAll().stream().filter(p -> p.active).forEach(p -> active.put(p.id, p));
        return counts.entrySet().stream()
                .filter(e -> active.containsKey(e.getKey()))
                .sorted(
                        Map.Entry.<Long, Integer>comparingByValue()
                                .reversed()
                                .thenComparing(Map.Entry.comparingByKey()))
                .limit(6)
                .map(
                        e ->
                                Map.<String, Object>of(
                                        "product",
                                        active.get(e.getKey()),
                                        "reason",
                                        "Appeared in " + e.getValue() + " saved plans"))
                .toList();
    }

    List<ReviewView> reviews(String targetType, Long targetId) {
        return reviews
                .findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId)
                .stream()
                .map(
                        r ->
                                new ReviewView(
                                        r.id,
                                        users.findById(r.ownerId)
                                                .map(u -> u.name)
                                                .orElse("Shopper"),
                                        r.targetType,
                                        r.targetId,
                                        r.rating,
                                        r.comment,
                                        r.createdAt))
                .toList();
    }

    Review addReview(@Valid Review input, Authentication a) {
        if (input.targetType.equals("PRODUCT")
                ? !products.existsById(input.targetId)
                : !stores.existsById(input.targetId))
            throw new IllegalArgumentException("Feedback target does not exist");
        input.id = null;
        input.ownerId = current(a).id;
        input.createdAt = Instant.now();
        return reviews.save(input);
    }

    Map<String, Boolean> deleteReview(Long id, Authentication a) {
        var r =
                reviews.findById(id)
                        .filter(x -> x.ownerId.equals(current(a).id))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Feedback not found"));
        reviews.delete(r);
        return Map.of("ok", true);
    }

    Map<String, Object> adminCatalog() {
        return Map.of(
                "products",
                products.findAll(),
                "stores",
                stores.findAll(),
                "inventory",
                inventories.findAll());
    }

    Product addProduct(@Valid Product p) {
        p.id = null;
        return products.save(p);
    }

    Product updateProduct(Long id, @Valid Product p) {
        var existing =
                products.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean variantChanged =
                !Objects.equals(existing.brand, p.brand)
                        || !Objects.equals(existing.packSize, p.packSize);
        if (variantChanged
                && (items.existsByProductId(id)
                        || inventories.findAll().stream().anyMatch(i -> i.productId.equals(id))))
            throw new IllegalArgumentException(
                    "Brand and pack size are fixed for products already used in inventory or lists."
                            + " Create a new product for another variant.");
        if (inventories.findAll().stream()
                .anyMatch(i -> i.productId.equals(id) && i.regularPrice > p.mrp))
            throw new IllegalArgumentException(
                    "MRP cannot be below an existing store selling price");
        p.id = id;
        return products.save(p);
    }

    Map<String, Boolean> archiveProduct(Long id) {
        var p =
                products.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        p.active = false;
        products.save(p);
        return Map.of("ok", true);
    }

    Store addStore(@Valid Store s) {
        s.id = null;
        if (s.type.equals("LOCAL")) s.fee = 0;
        return stores.save(s);
    }

    Store updateStore(Long id, @Valid Store s) {
        if (!stores.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        s.id = id;
        if (s.type.equals("LOCAL")) s.fee = 0;
        return stores.save(s);
    }

    Map<String, Boolean> archiveStore(Long id) {
        var s =
                stores.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        s.active = false;
        stores.save(s);
        return Map.of("ok", true);
    }

    Inventory inventory(@Valid Inventory i) {
        var p =
                products.findById(i.productId)
                        .orElseThrow(() -> new IllegalArgumentException("Unknown product"));
        if (!stores.existsById(i.storeId)) throw new IllegalArgumentException("Unknown store");
        if (i.regularPrice > p.mrp
                || i.offerPrice != null
                        && (i.offerPrice > i.regularPrice
                                || i.offerStart == null
                                || i.offerEnd == null
                                || !i.offerEnd.isAfter(i.offerStart)))
            throw new IllegalArgumentException(
                    "Prices must not exceed MRP; offers need a lower price and valid dates");
        i.id =
                inventories
                        .findByStoreIdAndProductId(i.storeId, i.productId)
                        .map(row -> row.id)
                        .orElse(null);
        i.updatedAt = Instant.now();
        return inventories.save(i);
    }
}
