package com.basketwise;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;

import java.util.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ApiIntegrationTest {
    @Container static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", mysql::getJdbcUrl);
        r.add("spring.datasource.username", mysql::getUsername);
        r.add("spring.datasource.password", mysql::getPassword);
        r.add("app.admin-email", () -> "admin@test.local");
        r.add("app.admin-password", () -> "test-fixture-password-123");
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ShoppingLists lists;
    @Autowired Products productRepository;
    @Autowired SavedPlans planRepository;
    @Autowired Inventories inventoryRepository;

    JsonNode body(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }

    String encode(Object v) throws Exception {
        return json.writeValueAsString(v);
    }

    MockHttpSession shopper() throws Exception {
        String email = "shopper-" + UUID.randomUUID() + "@test.local";
        mvc.perform(
                        post("/api/auth/register")
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "name",
                                                        "Shopper",
                                                        "email",
                                                        email,
                                                        "password",
                                                        "test-password-123"))))
                .andExpect(status().isCreated());
        return login(email, "test-password-123");
    }

    MockHttpSession login(String email, String password) throws Exception {
        return (MockHttpSession)
                mvc.perform(
                                post("/api/auth/login")
                                        .with(csrf())
                                        .param("email", email)
                                        .param("password", password))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getRequest()
                        .getSession(false);
    }

    Map<String, Object> request() {
        return Map.of(
                "locality",
                "Kothrud",
                "items",
                List.of(
                        Map.of("productId", 2, "quantity", 1),
                        Map.of("productId", 3, "quantity", 1)));
    }

    @Test
    void seedCatalogAndHealthArePublic() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products.length()").value(30))
                .andExpect(jsonPath("$.stores.length()").value(6));
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/api/catalog").param("locality", "Unknown"))
                .andExpect(jsonPath("$.stores.length()").value(0));
    }

    @Test
    void actualCsrfTokenSessionLoginRotationAndLogout() throws Exception {
        var tokenResult = mvc.perform(get("/api/auth/csrf")).andReturn();
        var token = body(tokenResult);
        var session = (MockHttpSession) tokenResult.getRequest().getSession(false);
        mvc.perform(
                        post("/api/auth/login")
                                .session(session)
                                .header(
                                        token.get("headerName").asText(),
                                        token.get("token").asText())
                                .param("email", "admin@test.local")
                                .param("password", "test-fixture-password-123"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
        var fresh = body(mvc.perform(get("/api/auth/csrf").session(session)).andReturn());
        mvc.perform(
                        post("/api/auth/logout")
                                .session(session)
                                .header(
                                        fresh.get("headerName").asText(),
                                        fresh.get("token").asText()))
                .andExpect(status().isOk());
        assertTrue(session.isInvalid());
    }

    @Test
    void unauthenticatedAndForgedMutationsAreDenied() throws Exception {
        mvc.perform(get("/api/lists")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .param("email", "missing@test.local")
                                .param("password", "wrong"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordAndEmailValidation() throws Exception {
        mvc.perform(
                        post("/api/auth/register")
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "name",
                                                        "Test",
                                                        "email",
                                                        "invalid",
                                                        "password",
                                                        "short"))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/auth/register")
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "name",
                                                        "Test",
                                                        "email",
                                                        "admin@test.local",
                                                        "password",
                                                        "long-test-password"))))
                .andExpect(status().isConflict());
    }

    @Test
    void usersCannotReadChangeOrDeleteOthersLists() throws Exception {
        var a = shopper();
        var b = shopper();
        var input = new HashMap<>(request());
        input.put("name", "Private list");
        long id =
                body(mvc.perform(
                                        post("/api/lists")
                                                .session(a)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(encode(input)))
                                .andExpect(status().isCreated())
                                .andReturn())
                        .path("list")
                        .path("id")
                        .asLong();
        mvc.perform(get("/api/lists").session(b)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(
                        put("/api/lists/" + id)
                                .session(b)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(input)))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/lists/" + id).session(b).with(csrf()))
                .andExpect(status().isNotFound());
        input.put("name", "Updated list");
        mvc.perform(
                        put("/api/lists/" + id)
                                .session(a)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(input)))
                .andExpect(status().isOk());
        assertEquals("Updated list", lists.findById(id).orElseThrow().name);
        mvc.perform(delete("/api/lists/" + id).session(a).with(csrf())).andExpect(status().isOk());
    }

    @Test
    void rolesAndInventoryValidationAreEnforced() throws Exception {
        var s = shopper();
        mvc.perform(get("/api/admin/catalog").session(s)).andExpect(status().isForbidden());
        var a = login("admin@test.local", "test-fixture-password-123");
        mvc.perform(
                        put("/api/admin/inventory")
                                .session(a)
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "productId",
                                                        2,
                                                        "storeId",
                                                        1,
                                                        "stock",
                                                        -1,
                                                        "regularPrice",
                                                        20000))))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        put("/api/admin/inventory")
                                .session(a)
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "productId",
                                                        2,
                                                        "storeId",
                                                        1,
                                                        "stock",
                                                        4,
                                                        "regularPrice",
                                                        999999))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void serverSnapshotsIgnoreClientTotalsAndSurvivePriceChanges() throws Exception {
        var shopper = shopper();
        var admin = login("admin@test.local", "test-fixture-password-123");
        var compare =
                body(
                        mvc.perform(
                                        post("/api/comparisons")
                                                .session(shopper)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(encode(request())))
                                .andExpect(status().isOk())
                                .andReturn());
        var best = compare.path("bestSingle");
        var input =
                Map.of(
                        "name",
                        "Immutable plan",
                        "request",
                        request(),
                        "basketKey",
                        best.path("key").asText(),
                        "total",
                        1);
        var saved =
                body(
                        mvc.perform(
                                        post("/api/plans")
                                                .session(shopper)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(encode(input)))
                                .andExpect(status().isCreated())
                                .andReturn());
        String snapshot = saved.path("snapshot").asText();
        assertEquals(
                best.path("total").asLong(),
                json.readTree(snapshot).path("basket").path("total").asLong());
        var catalog = body(mvc.perform(get("/api/admin/catalog").session(admin)).andReturn());
        JsonNode original = null;
        for (var i : catalog.path("inventory"))
            if (i.path("storeId").asLong() == 1 && i.path("productId").asLong() == 2) original = i;
        assertNotNull(original);
        var changed = (com.fasterxml.jackson.databind.node.ObjectNode) original.deepCopy();
        changed.put("regularPrice", 1);
        changed.putNull("offerPrice");
        try {
            mvc.perform(
                            put("/api/admin/inventory")
                                    .session(admin)
                                    .with(csrf())
                                    .contentType("application/json")
                                    .content(changed.toString()))
                    .andExpect(status().isOk());
            var after =
                    body(
                            mvc.perform(
                                            post("/api/comparisons")
                                                    .session(shopper)
                                                    .with(csrf())
                                                    .contentType("application/json")
                                                    .content(encode(request())))
                                    .andReturn());
            assertNotEquals(compare.toString(), after.toString());
            var history = body(mvc.perform(get("/api/plans").session(shopper)).andReturn());
            assertEquals(snapshot, history.get(0).path("snapshot").asText());
            mvc.perform(get("/api/plans").session(shopper()))
                    .andExpect(jsonPath("$.length()").value(0));
            mvc.perform(
                            delete("/api/plans/" + saved.path("id").asLong())
                                    .session(shopper())
                                    .with(csrf()))
                    .andExpect(status().isNotFound());
        } finally {
            mvc.perform(
                            put("/api/admin/inventory")
                                    .session(admin)
                                    .with(csrf())
                                    .contentType("application/json")
                                    .content(original.toString()))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void invalidComparisonAndUnavailableLocalityAreExplained() throws Exception {
        var s = shopper();
        mvc.perform(
                        post("/api/comparisons")
                                .session(s)
                                .with(csrf())
                                .contentType("application/json")
                                .content("{\"locality\":\"Kothrud\",\"items\":[]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/comparisons")
                                .session(s)
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        "{\"locality\":\"Kothrud\",\"items\":[{\"productId\":99999,\"quantity\":1}]}"))
                .andExpect(status().isBadRequest());
        var r = new HashMap<>(request());
        r.put("locality", "Unserved");
        mvc.perform(
                        post("/api/comparisons")
                                .session(s)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(r)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bestSingle").isEmpty());
    }

    @Test
    void feedbackValidationAndOwnership() throws Exception {
        var s = shopper();
        var input =
                Map.of(
                        "targetType",
                        "PRODUCT",
                        "targetId",
                        1,
                        "rating",
                        5,
                        "comment",
                        "Helpful sample product feedback");
        long id =
                body(mvc.perform(
                                        post("/api/reviews")
                                                .session(s)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(encode(input)))
                                .andExpect(status().isCreated())
                                .andReturn())
                        .path("id")
                        .asLong();
        mvc.perform(get("/api/reviews").param("targetType", "PRODUCT").param("targetId", "1"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/reviews/" + id).session(shopper()).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/reviews/" + id).session(s).with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void fractionalPackQuantitiesAreRejectedRatherThanTruncated() throws Exception {
        mvc.perform(
                        post("/api/comparisons")
                                .session(shopper())
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        "{\"locality\":\"Kothrud\",\"items\":[{\"productId\":2,\"quantity\":1.5}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void multiBytePasswordLimitIsExplained() throws Exception {
        mvc.perform(
                        post("/api/auth/register")
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "name",
                                                        "Shopper",
                                                        "email",
                                                        "unicode@test.local",
                                                        "password",
                                                        "界".repeat(30)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must fit within 72 UTF-8 bytes"));
    }

    @Test
    void nullLinesAndInvalidOrMissingParametersReturn400() throws Exception {
        var session = shopper();
        for (String endpoint : List.of("/api/comparisons", "/api/lists")) {
            mvc.perform(
                            post(endpoint)
                                    .session(session)
                                    .with(csrf())
                                    .contentType("application/json")
                                    .content(
                                            "{\"name\":\"Invalid\",\"locality\":\"Kothrud\",\"items\":[null]}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/reviews")).andExpect(status().isBadRequest());
        mvc.perform(
                        get("/api/reviews")
                                .param("targetType", "PRODUCT")
                                .param("targetId", "not-a-number"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        put("/api/admin/products/not-a-number")
                                .session(login("admin@test.local", "test-fixture-password-123"))
                                .with(csrf())
                                .contentType("application/json")
                                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminServiceAreasAreDiscoverableAndArchivedStoresDisappear() throws Exception {
        var admin = login("admin@test.local", "test-fixture-password-123");
        String area = "Aundh " + UUID.randomUUID();
        Map<String, Object> store =
                new HashMap<>(
                        Map.of(
                                "name",
                                "Service area fixture",
                                "type",
                                "ONLINE",
                                "address",
                                "Sample Pune address",
                                "localities",
                                "  " + area + ", " + area.toLowerCase() + "  ",
                                "fee",
                                2000,
                                "deliveryMinutes",
                                25,
                                "active",
                                true));
        long id =
                body(mvc.perform(
                                        post("/api/admin/stores")
                                                .session(admin)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(encode(store)))
                                .andExpect(status().isOk())
                                .andReturn())
                        .path("id")
                        .asLong();
        var names =
                body(mvc.perform(get("/api/localities")).andExpect(status().isOk()).andReturn());
        long matches = 0;
        for (var name : names) if (name.asText().equalsIgnoreCase(area)) matches++;
        assertEquals(1, matches);
        mvc.perform(get("/api/stores").param("locality", area.toLowerCase()))
                .andExpect(jsonPath("$.length()").value(1));
        store.put("type", "LOCAL");
        store.put("fee", 9999);
        mvc.perform(
                        put("/api/admin/stores/" + id)
                                .session(admin)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(store)))
                .andExpect(jsonPath("$.fee").value(0));
        mvc.perform(delete("/api/admin/stores/" + id).session(admin).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/stores").param("locality", area))
                .andExpect(jsonPath("$.length()").value(0));
        names = body(mvc.perform(get("/api/localities")).andReturn());
        for (var name : names) assertFalse(name.asText().equalsIgnoreCase(area));
    }

    @Test
    void suggestionsRefillSixActiveProductsAfterHigherRankedProductsAreArchived() throws Exception {
        var session = shopper();
        long userId =
                body(mvc.perform(get("/api/auth/me").session(session)).andReturn())
                        .path("user")
                        .path("id")
                        .asLong();
        var created = new ArrayList<Models.Product>();
        var plan = new Models.SavedPlan();
        try {
            for (int n = 0; n < 8; n++) {
                var p = new Models.Product();
                p.name = "Suggestion fixture " + n;
                p.brand = "Fixture";
                p.packSize = "1 kg";
                p.category = "Staples";
                p.imageUrl = "/images/rice.svg";
                p.mrp = 10000;
                created.add(productRepository.save(p));
            }
            plan.ownerId = userId;
            plan.name = "Recommendation fixture";
            plan.locality = "Kothrud";
            plan.snapshot =
                    encode(
                            Map.of(
                                    "request",
                                    Map.of(
                                            "items",
                                            created.stream()
                                                    .map(
                                                            p ->
                                                                    Map.of(
                                                                            "productId",
                                                                            p.id,
                                                                            "quantity",
                                                                            1))
                                                    .toList())));
            planRepository.save(plan);
            for (int n = 0; n < 2; n++) {
                created.get(n).active = false;
                productRepository.save(created.get(n));
            }
            var suggestions =
                    body(
                            mvc.perform(get("/api/suggestions").session(session))
                                    .andExpect(status().isOk())
                                    .andReturn());
            assertEquals(6, suggestions.size());
            for (var suggestion : suggestions) {
                assertTrue(suggestion.path("product").path("active").asBoolean());
                assertEquals("Appeared in 1 saved plans", suggestion.path("reason").asText());
            }
        } finally {
            if (plan.id != null) planRepository.deleteById(plan.id);
            productRepository.deleteAll(created);
        }
    }

    @Test
    void duplicateProductsNegativeBudgetAndInvalidReviewAreRejected() throws Exception {
        var session = shopper();
        var input =
                Map.of(
                        "locality",
                        "Kothrud",
                        "items",
                        List.of(
                                Map.of("productId", 2, "quantity", 1),
                                Map.of("productId", 2, "quantity", 2)));
        mvc.perform(
                        post("/api/comparisons")
                                .session(session)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(input)))
                .andExpect(status().isBadRequest());
        var negative = new HashMap<>(request());
        negative.put("budget", -1);
        mvc.perform(
                        post("/api/comparisons")
                                .session(session)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(negative)))
                .andExpect(status().isBadRequest());
        for (int rating : List.of(0, 6))
            mvc.perform(
                            post("/api/reviews")
                                    .session(session)
                                    .with(csrf())
                                    .contentType("application/json")
                                    .content(
                                            encode(
                                                    Map.of(
                                                            "targetType",
                                                            "PRODUCT",
                                                            "targetId",
                                                            2,
                                                            "rating",
                                                            rating,
                                                            "comment",
                                                            "Test"))))
                    .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/reviews")
                                .session(session)
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "targetType",
                                                        "PRODUCT",
                                                        "targetId",
                                                        999999,
                                                        "rating",
                                                        5,
                                                        "comment",
                                                        "Test"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registrationCannotChooseAdministratorRole() throws Exception {
        String email = "role-" + UUID.randomUUID() + "@test.local";
        mvc.perform(
                        post("/api/auth/register")
                                .with(csrf())
                                .contentType("application/json")
                                .content(
                                        encode(
                                                Map.of(
                                                        "name",
                                                        "Shopper",
                                                        "email",
                                                        email,
                                                        "password",
                                                        "test-password-123",
                                                        "role",
                                                        "ADMIN"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("SHOPPER"));
        mvc.perform(get("/api/admin/catalog").session(login(email, "test-password-123")))
                .andExpect(status().isForbidden());
    }

    @Test
    void catalogAndComparisonApplyOfferWindowsAndFreshnessConsistently() throws Exception {
        var admin = login("admin@test.local", "test-fixture-password-123");
        var shopper = shopper();
        String area = "Offer fixture " + UUID.randomUUID();
        var p =
                body(
                        mvc.perform(
                                        post("/api/admin/products")
                                                .session(admin)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(
                                                        encode(
                                                                Map.of(
                                                                        "name",
                                                                        "Offer fixture",
                                                                        "brand",
                                                                        "Fixture",
                                                                        "packSize",
                                                                        "1 kg",
                                                                        "category",
                                                                        "Staples",
                                                                        "imageUrl",
                                                                        "/images/rice.svg",
                                                                        "mrp",
                                                                        12000,
                                                                        "active",
                                                                        true))))
                                .andReturn());
        long productId = p.path("id").asLong();
        var s =
                body(
                        mvc.perform(
                                        post("/api/admin/stores")
                                                .session(admin)
                                                .with(csrf())
                                                .contentType("application/json")
                                                .content(
                                                        encode(
                                                                Map.of(
                                                                        "name",
                                                                        "Offer fixture store",
                                                                        "type",
                                                                        "ONLINE",
                                                                        "address",
                                                                        "Sample Pune address",
                                                                        "localities",
                                                                        area,
                                                                        "fee",
                                                                        1500,
                                                                        "deliveryMinutes",
                                                                        25,
                                                                        "active",
                                                                        true))))
                                .andReturn());
        long storeId = s.path("id").asLong();
        var now = java.time.Instant.now();
        try {
            for (int mode = 0; mode < 3; mode++) {
                var start = now.plusSeconds(mode == 0 ? -3600 : mode == 1 ? -7200 : 3600);
                var end = now.plusSeconds(mode == 0 ? 3600 : mode == 1 ? -3600 : 7200);
                var inventory =
                        Map.of(
                                "productId",
                                productId,
                                "storeId",
                                storeId,
                                "stock",
                                10,
                                "regularPrice",
                                10000,
                                "offerPrice",
                                7000,
                                "offerText",
                                "Audit offer",
                                "offerStart",
                                start.toString(),
                                "offerEnd",
                                end.toString());
                mvc.perform(
                                put("/api/admin/inventory")
                                        .session(admin)
                                        .with(csrf())
                                        .contentType("application/json")
                                        .content(encode(inventory)))
                        .andExpect(status().isOk());
                var row =
                        inventoryRepository
                                .findByStoreIdAndProductId(storeId, productId)
                                .orElseThrow();
                row.updatedAt = now.minusSeconds(25 * 3600);
                inventoryRepository.save(row);
                var catalog =
                        body(mvc.perform(get("/api/catalog").param("locality", area)).andReturn());
                assertEquals(
                        mode == 0 ? 7000 : 10000,
                        catalog.path("offers").get(0).path("price").asLong());
                assertTrue(catalog.path("offers").get(0).path("stale").asBoolean());
                var request =
                        Map.of(
                                "locality",
                                area,
                                "budget",
                                1,
                                "items",
                                List.of(Map.of("productId", productId, "quantity", 2)));
                var basket =
                        body(mvc.perform(
                                                post("/api/comparisons")
                                                        .session(shopper)
                                                        .with(csrf())
                                                        .contentType("application/json")
                                                        .content(encode(request)))
                                        .andExpect(status().isOk())
                                        .andReturn())
                                .path("bestSingle");
                assertEquals(mode == 0 ? 15500 : 21500, basket.path("total").asLong());
                assertEquals(1500, basket.path("fees").asLong());
                assertTrue(basket.path("items").get(0).path("stale").asBoolean());
                assertEquals(basket.path("total").asLong() - 1, basket.path("overBudget").asLong());
            }
        } finally {
            mvc.perform(delete("/api/admin/products/" + productId).session(admin).with(csrf()));
            mvc.perform(delete("/api/admin/stores/" + storeId).session(admin).with(csrf()));
        }
    }

    @Test
    void adminCannotSilentlyReplaceTheBrandOrPackOfAStockedProduct() throws Exception {
        var admin = login("admin@test.local", "test-fixture-password-123");
        var original = productRepository.findById(2L).orElseThrow();
        var input = new HashMap<String, Object>();
        input.put("name", original.name);
        input.put("brand", "Unexpected replacement");
        input.put("packSize", "99 kg");
        input.put("category", original.category);
        input.put("imageUrl", original.imageUrl);
        input.put("mrp", original.mrp);
        input.put("active", true);
        mvc.perform(
                        put("/api/admin/products/2")
                                .session(admin)
                                .with(csrf())
                                .contentType("application/json")
                                .content(encode(input)))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Brand and pack size are fixed for products already used in"
                                                + " inventory or lists. Create a new product for"
                                                + " another variant."));
        var stored = productRepository.findById(2L).orElseThrow();
        assertEquals(original.brand, stored.brand);
        assertEquals(original.packSize, stored.packSize);
    }
}
