package com.basketwise;

import java.time.Instant;
import java.util.*;

/** Pure calculation: no repository, network, clock or mutable shared state. */
public class ComparisonEngine {
    public record Item(long productId, int quantity) {}

    public record Offer(
            long productId, long price, long mrp, int stock, boolean stale, Instant updatedAt) {}

    public record Shop(
            long id, String name, String type, long fee, int deliveryMinutes, List<Offer> offers) {}

    public record Allocation(
            long productId,
            int quantity,
            long storeId,
            String storeName,
            long unitPrice,
            long mrp,
            long lineTotal,
            boolean stale,
            Instant updatedAt) {}

    public record Basket(
            String key,
            List<ShopSummary> stores,
            List<Allocation> items,
            List<Long> missing,
            long subtotal,
            long discount,
            long fees,
            long total,
            boolean complete,
            Long overBudget) {}

    public record ShopSummary(long id, String name, String type, long fee, int deliveryMinutes) {}

    public record Result(
            List<Basket> singleStores,
            List<Basket> splitStores,
            Basket bestSingle,
            Basket bestSplit,
            long splitSavings,
            String message) {}

    private static final Comparator<Basket> ORDER =
            Comparator.comparingLong(Basket::total)
                    .thenComparingInt(b -> b.stores().size())
                    .thenComparing(
                            b ->
                                    b.stores().stream()
                                            .map(ShopSummary::name)
                                            .reduce("", (a, c) -> a + "|" + c))
                    .thenComparing(Basket::key);

    public Result compare(List<Item> items, List<Shop> shops, Long budget) {
        if (items == null || items.isEmpty())
            throw new IllegalArgumentException("Add at least one product");
        if (items.stream().anyMatch(i -> i.quantity() < 1 || i.quantity() > 999)
                || items.stream().map(Item::productId).distinct().count() != items.size())
            throw new IllegalArgumentException("Use unique products with quantities from 1 to 999");
        List<Basket> singles = new ArrayList<>(), splits = new ArrayList<>();
        var ordered =
                shops.stream()
                        .sorted(Comparator.comparing(Shop::name).thenComparingLong(Shop::id))
                        .toList();
        for (int a = 0; a < ordered.size(); a++) {
            singles.add(basket(items, List.of(ordered.get(a)), budget));
            for (int b = a + 1; b < ordered.size(); b++) {
                Basket pair = basket(items, List.of(ordered.get(a), ordered.get(b)), budget);
                if (pair.complete() && pair.stores().size() == 2) splits.add(pair);
            }
        }
        singles.sort(Comparator.comparing(Basket::complete).reversed().thenComparing(ORDER));
        splits.sort(ORDER);
        Basket best = singles.stream().filter(Basket::complete).min(ORDER).orElse(null);
        Basket split = splits.stream().min(ORDER).orElse(null);
        long savings =
                best != null && split != null ? Math.max(0, best.total() - split.total()) : 0;
        return new Result(
                singles,
                splits,
                best,
                split,
                savings,
                best == null && split == null
                        ? "No complete basket is available. Review missing items or choose"
                                + " alternatives."
                        : savings > 0
                                ? "Two stores reduce your total after fees. Pickup travel costs are"
                                        + " excluded."
                                : best != null
                                        ? "A single store is the best value after fees."
                                        : "Your list is available across two stores.");
    }

    private Basket basket(List<Item> items, List<Shop> shops, Long budget) {
        List<Allocation> lines = new ArrayList<>();
        List<Long> missing = new ArrayList<>();
        for (Item item : items) {
            Shop chosen = null;
            Offer selected = null;
            for (Shop shop : shops)
                for (Offer offer : shop.offers()) {
                    if (offer.productId() == item.productId()
                            && offer.stock() >= item.quantity()
                            && (selected == null || offer.price() < selected.price())) {
                        chosen = shop;
                        selected = offer;
                    }
                }
            if (selected == null) missing.add(item.productId());
            else
                lines.add(
                        new Allocation(
                                item.productId(),
                                item.quantity(),
                                chosen.id(),
                                chosen.name(),
                                selected.price(),
                                selected.mrp(),
                                Math.multiplyExact(selected.price(), item.quantity()),
                                selected.stale(),
                                selected.updatedAt()));
        }
        Set<Long> used = new HashSet<>();
        lines.forEach(l -> used.add(l.storeId()));
        List<ShopSummary> summaries =
                shops.stream()
                        .filter(s -> used.contains(s.id()))
                        .map(
                                s ->
                                        new ShopSummary(
                                                s.id(),
                                                s.name(),
                                                s.type(),
                                                s.type().equals("LOCAL") ? 0 : s.fee(),
                                                s.deliveryMinutes()))
                        .toList();
        long subtotal = lines.stream().mapToLong(Allocation::lineTotal).sum();
        long discount =
                lines.stream()
                        .mapToLong(l -> Math.max(0, l.mrp() - l.unitPrice()) * l.quantity())
                        .sum();
        long fees = summaries.stream().mapToLong(ShopSummary::fee).sum();
        String key =
                shops.stream()
                        .map(s -> Long.toString(s.id()))
                        .reduce((a, b) -> a + "-" + b)
                        .orElse("");
        return new Basket(
                key,
                summaries,
                lines,
                missing,
                subtotal,
                discount,
                fees,
                subtotal + fees,
                missing.isEmpty(),
                budget == null ? null : Math.max(0, subtotal + fees - budget));
    }
}
