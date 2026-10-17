package com.basketwise;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;

import java.util.Optional;

class AccountServiceTest {
    @Test
    void accountLookupNormalizesEmailAndReturnsOnlyStoredRole() {
        Users users = mock(Users.class);
        var u = new Models.User();
        u.email = "shopper@example.test";
        u.role = "SHOPPER";
        u.passwordHash = "encoded-value";
        when(users.findByEmail(u.email)).thenReturn(Optional.of(u));
        var details =
                new SecurityConfig().accounts(users).loadUserByUsername("  SHOPPER@EXAMPLE.TEST ");
        assertEquals(u.email, details.getUsername());
        assertEquals("ROLE_SHOPPER", details.getAuthorities().iterator().next().getAuthority());
        verify(users).findByEmail(u.email);
    }
}
