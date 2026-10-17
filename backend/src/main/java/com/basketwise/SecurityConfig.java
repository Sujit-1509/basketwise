package com.basketwise;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwords() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService accounts(Users users) {
        return email ->
                users.findByEmail(email.toLowerCase(java.util.Locale.ROOT).trim())
                        .map(
                                u ->
                                        User.withUsername(u.email)
                                                .password(u.passwordHash)
                                                .roles(u.role)
                                                .build())
                        .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(
                        a ->
                                a.requestMatchers("/api/admin/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers(
                                                "/api/auth/csrf",
                                                "/api/auth/me",
                                                "/api/auth/register",
                                                "/api/auth/login",
                                                "/actuator/health")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/products",
                                                "/api/stores",
                                                "/api/catalog",
                                                "/api/reviews",
                                                "/api/localities")
                                        .permitAll()
                                        .requestMatchers("/api/**")
                                        .authenticated()
                                        .anyRequest()
                                        .permitAll())
                .formLogin(
                        f ->
                                f.loginProcessingUrl("/api/auth/login")
                                        .usernameParameter("email")
                                        .successHandler(
                                                (req, res, auth) -> {
                                                    res.setContentType("application/json");
                                                    res.getWriter().write("{\"ok\":true}");
                                                })
                                        .failureHandler(
                                                (req, res, e) -> {
                                                    res.setStatus(401);
                                                    res.setContentType("application/json");
                                                    res.getWriter()
                                                            .write(
                                                                    "{\"message\":\"Incorrect email"
                                                                            + " or password\"}");
                                                }))
                .logout(
                        l ->
                                l.logoutUrl("/api/auth/logout")
                                        .deleteCookies("JSESSIONID")
                                        .logoutSuccessHandler(
                                                (req, res, auth) -> {
                                                    res.setContentType("application/json");
                                                    res.getWriter().write("{\"ok\":true}");
                                                }))
                .exceptionHandling(
                        e ->
                                e.authenticationEntryPoint(
                                                (req, res, x) -> {
                                                    res.setStatus(401);
                                                    res.setContentType("application/json");
                                                    res.getWriter()
                                                            .write(
                                                                    "{\"message\":\"Please sign"
                                                                            + " in\"}");
                                                })
                                        .accessDeniedHandler(
                                                (req, res, x) -> {
                                                    res.setStatus(403);
                                                    res.setContentType("application/json");
                                                    res.getWriter()
                                                            .write(
                                                                    "{\"message\":\"Access denied"
                                                                            + " or CSRF token"
                                                                            + " expired\"}");
                                                }))
                .build();
    }
}
