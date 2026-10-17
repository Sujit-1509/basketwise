package com.basketwise;

import com.basketwise.Models.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;

@Component
public class SeedData implements CommandLineRunner {
    final Products products;
    final Stores stores;
    final Inventories inventory;
    final Users users;
    final PasswordEncoder encoder;

    @Value("${app.seed}")
    boolean seed;

    @Value("${app.admin-email}")
    String adminEmail;

    @Value("${app.admin-password}")
    String adminPassword;

    SeedData(
            Products products,
            Stores stores,
            Inventories inventory,
            Users users,
            PasswordEncoder encoder) {
        this.products = products;
        this.stores = stores;
        this.inventory = inventory;
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!adminEmail.isBlank()
                && !adminPassword.isBlank()
                && users.findByEmail(adminEmail.toLowerCase()).isEmpty()) {
            if (adminPassword.length() < 12)
                throw new IllegalArgumentException(
                        "Initial admin password must have at least 12 characters");
            var u = new User();
            u.email = adminEmail.trim().toLowerCase();
            u.name = "Catalog administrator";
            u.role = "ADMIN";
            u.passwordHash = encoder.encode(adminPassword);
            users.save(u);
        }
        if (!seed || products.count() > 0) return;
        String[][] data = {
            {"Whole Wheat Atta", "Harvest House", "5 kg", "Staples", "atta", "32000"},
            {"Everyday Basmati Rice", "Grain & Good", "1 kg", "Staples", "rice", "16500"},
            {"Fine White Sugar", "Pantry Co.", "1 kg", "Staples", "sugar", "6500"},
            {"Toor Dal", "Harvest House", "1 kg", "Pulses", "lentils", "21000"},
            {"Sunflower Oil", "Golden Drop", "1 L", "Cooking", "oil", "19000"},
            {"Full Cream Milk", "Morning Dairy", "1 L", "Dairy", "milk", "7600"},
            {"Rolled Oats", "Grain & Good", "500 g", "Breakfast", "oats", "16500"},
            {"Farm Eggs", "Farm Basket", "6 pieces", "Dairy", "eggs", "8500"},
            {"Tea Leaves", "Hill Garden", "250 g", "Beverages", "tea", "18000"},
            {"Filter Coffee", "Hill Garden", "200 g", "Beverages", "coffee", "24000"},
            {"Besan", "Harvest House", "500 g", "Staples", "atta", "8500"},
            {"Moong Dal", "Pantry Co.", "1 kg", "Pulses", "lentils", "17000"},
            {"Chana Dal", "Pantry Co.", "1 kg", "Pulses", "lentils", "12500"},
            {"Kabuli Chana", "Grain & Good", "500 g", "Pulses", "lentils", "11000"},
            {"Poha", "Harvest House", "500 g", "Breakfast", "rice", "6500"},
            {"Rava", "Pantry Co.", "500 g", "Staples", "atta", "6000"},
            {"Iodised Salt", "Pantry Co.", "1 kg", "Cooking", "salt", "3000"},
            {"Turmeric Powder", "Spice Route", "100 g", "Cooking", "spice", "4500"},
            {"Red Chilli Powder", "Spice Route", "100 g", "Cooking", "spice", "6000"},
            {"Cumin Seeds", "Spice Route", "100 g", "Cooking", "spice", "9000"},
            {"Ghee", "Morning Dairy", "500 mL", "Dairy", "ghee", "36000"},
            {"Fresh Curd", "Morning Dairy", "400 g", "Dairy", "curd", "6000"},
            {"Paneer", "Morning Dairy", "200 g", "Dairy", "paneer", "10500"},
            {"Whole Wheat Bread", "Baker Street", "400 g", "Breakfast", "bread", "5500"},
            {"Peanut Butter", "Nut Grove", "340 g", "Breakfast", "butter", "21000"},
            {"Almonds", "Nut Grove", "200 g", "Snacks", "nuts", "26000"},
            {"Marie Biscuits", "Baker Street", "250 g", "Snacks", "biscuits", "5000"},
            {"Whole Wheat Atta", "Grain & Good", "5 kg", "Staples", "atta", "34000"},
            {"Everyday Basmati Rice", "Harvest House", "1 kg", "Staples", "rice", "17500"},
            {"Fine White Sugar", "Harvest House", "1 kg", "Staples", "sugar", "6800"}
        };
        for (String[] d : data) {
            var p = new Product();
            p.name = d[0];
            p.brand = d[1];
            p.packSize = d[2];
            p.category = d[3];
            p.imageUrl = "/images/" + d[4] + ".svg";
            p.mrp = Long.parseLong(d[5]);
            products.save(p);
        }
        String[] names = {
            "Quick Basket",
            "Daily Door",
            "Pantry Express",
            "Kothrud Kirana",
            "Neighbour's Pantry",
            "Green Lane Mart"
        };
        for (int n = 0; n < 6; n++) {
            var s = new Store();
            s.name = names[n];
            s.type = n < 3 ? "ONLINE" : "LOCAL";
            s.address = (n + 12) + ", Sample Lane, Kothrud, Pune (fictional)";
            s.localities = "Kothrud";
            s.fee = n < 3 ? (n + 1) * 1900 : 0;
            s.deliveryMinutes = 20 + n * 10;
            stores.save(s);
        }
        Instant now = Instant.now();
        int n = 0;
        for (var s : stores.findAll()) {
            int j = 0;
            for (var p : products.findAll()) {
                var i = new Inventory();
                i.storeId = s.id;
                i.productId = p.id;
                i.stock = (j + n * 3) % 17 == 0 ? 0 : 12 + (j * 3 + n) % 40;
                i.regularPrice = p.mrp * (82 + (j * 7 + n * 5) % 15) / 100;
                if ((j + n) % 5 == 0) {
                    i.offerPrice = i.regularPrice * 90 / 100;
                    i.offerText = "Pantry saver Â· 10% off";
                    i.offerStart = now.minus(Duration.ofDays(1));
                    i.offerEnd = now.plus(Duration.ofDays(7));
                }
                i.updatedAt = now.minus(Duration.ofHours((j + n) % 13 == 0 ? 28 : 2));
                inventory.save(i);
                j++;
            }
            n++;
        }
    }
}
