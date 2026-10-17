package com.basketwise;

import static org.junit.jupiter.api.Assertions.*;

import com.basketwise.ComparisonEngine.*;
import com.basketwise.Models.Inventory;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.*;

class ComparisonEngineTest {
    ComparisonEngine engine = new ComparisonEngine();

    Offer offer(long id, long price, int stock) {
        return new Offer(id, price, 20000, stock, false, Instant.EPOCH);
    }

    Shop shop(long id, String type, long fee, Offer... offers) {
        return new Shop(id, "Store " + id, type, fee, 30, List.of(offers));
    }

    @Test
    void feesReverseApparentSavings() {
        var result =
                engine.compare(
                        List.of(new Item(1, 1), new Item(2, 1)),
                        List.of(
                                shop(1, "ONLINE", 500, offer(1, 100, 9), offer(2, 500, 9)),
                                shop(2, "LOCAL", 900, offer(1, 200, 9), offer(2, 200, 9))),
                        350L);
        assertEquals(400, result.bestSingle().total());
        assertEquals(50, result.bestSingle().overBudget());
        assertEquals(0, result.bestSingle().fees());
    }

    @Test
    void stockShortageAndNoCompleteBasket() {
        var r =
                engine.compare(
                        List.of(new Item(1, 3)),
                        List.of(shop(1, "ONLINE", 0, offer(1, 1, 2))),
                        null);
        assertNull(r.bestSingle());
        assertNull(r.bestSplit());
        assertEquals(List.of(1L), r.singleStores().getFirst().missing());
    }

    @Test
    void quantitiesAreWholeLinesAndFeesOnce() {
        var r =
                engine.compare(
                        List.of(new Item(1, 2), new Item(2, 3)),
                        List.of(
                                shop(1, "ONLINE", 100, offer(1, 10, 2)),
                                shop(2, "ONLINE", 200, offer(2, 20, 3))),
                        null);
        assertNull(r.bestSingle());
        assertEquals(380, r.bestSplit().total());
        assertEquals(300, r.bestSplit().fees());
    }

    @Test
    void deterministicTiesAndInvalidLines() {
        var r =
                engine.compare(
                        List.of(new Item(1, 1)),
                        List.of(
                                shop(2, "LOCAL", 0, offer(1, 100, 2)),
                                shop(1, "LOCAL", 0, offer(1, 100, 2))),
                        null);
        assertEquals(1, r.bestSingle().stores().getFirst().id());
        assertThrows(
                IllegalArgumentException.class, () -> engine.compare(List.of(), List.of(), null));
        assertThrows(
                IllegalArgumentException.class,
                () -> engine.compare(List.of(new Item(1, 1), new Item(1, 2)), List.of(), null));
    }

    @Test
    void offerDatesAreExclusiveAtEnd() {
        var i = new Inventory();
        i.regularPrice = 200;
        i.offerPrice = 100L;
        i.offerStart = Instant.parse("2026-01-01T00:00:00Z");
        i.offerEnd = i.offerStart.plusSeconds(60);
        assertEquals(200, i.price(i.offerStart.minusSeconds(1)));
        assertEquals(100, i.price(i.offerStart));
        assertEquals(200, i.price(i.offerEnd));
    }

    @Test
    void randomCatalogsAgreeWithIndependentExhaustiveOracle() {
        Random random = new Random(3111);
        for (int trial = 0; trial < 400; trial++) {
            int count = 1 + random.nextInt(5);
            var lines = new ArrayList<Item>();
            for (int p = 1; p <= count; p++) lines.add(new Item(p, 1 + random.nextInt(3)));
            var shops = new ArrayList<Shop>();
            for (int s = 1; s <= 4; s++) {
                var offers = new ArrayList<Offer>();
                for (int p = 1; p <= count; p++)
                    offers.add(offer(p, 1 + random.nextInt(1000), random.nextInt(5)));
                shops.add(
                        shop(
                                s,
                                s % 2 == 0 ? "LOCAL" : "ONLINE",
                                random.nextInt(900),
                                offers.toArray(Offer[]::new)));
            }
            long expected = oracle(lines, shops, 0, new HashSet<>(), 0);
            var result = engine.compare(lines, shops, null);
            long actual =
                    java.util.stream.Stream.concat(
                                    result.singleStores().stream(), result.splitStores().stream())
                            .filter(Basket::complete)
                            .mapToLong(Basket::total)
                            .min()
                            .orElse(Long.MAX_VALUE);
            assertEquals(expected, actual, "trial " + trial);
        }
    }

    long oracle(List<Item> lines, List<Shop> shops, int at, Set<Long> used, long total) {
        if (at == lines.size()) {
            long fees = 0;
            for (var s : shops)
                if (used.contains(s.id()) && !s.type().equals("LOCAL")) fees += s.fee();
            return total + fees;
        }
        long best = Long.MAX_VALUE;
        Item line = lines.get(at);
        for (var s : shops) {
            if (!used.contains(s.id()) && used.size() == 2) continue;
            for (var o : s.offers())
                if (o.productId() == line.productId() && o.stock() >= line.quantity()) {
                    var next = new HashSet<>(used);
                    next.add(s.id());
                    best =
                            Math.min(
                                    best,
                                    oracle(
                                            lines,
                                            shops,
                                            at + 1,
                                            next,
                                            total + o.price() * line.quantity()));
                }
        }
        return best;
    }
}
