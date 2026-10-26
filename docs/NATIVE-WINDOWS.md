# Native Windows setup

Basketwise runs as two background Windows processes: MySQL 8.4 and Java 21. Spring Boot serves both the React build and REST endpoints at http://localhost:18080. Docker Desktop can remain closed.

Use PowerShell 7. First-time setup is `scripts/setup-native.ps1`, then `scripts/build-native.ps1`. Daily startup is `scripts/start.ps1`; shutdown is `scripts/stop.ps1`. Run these from the project directory with a `./` prefix. The startup script checks port ownership before reusing a process. If another application owns 3307 or 18080, it stops with an explanation instead of terminating it.

Setup uses the official [Temurin archive](https://adoptium.net/installation/archives) and [MySQL Windows ZIP distribution](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html). The Java archive has a pinned SHA-256 check; the extracted MySQL server must have a valid Windows Authenticode signature. MySQL requires the Microsoft Visual C++ runtime described in its installation guide. Node is needed for frontend builds, but not for running a previously built JAR.

## Locations

| Location | Contents |
|---|---|
| `%LOCALAPPDATA%/Basketwise/runtime` | Private Java 21 JDK and MySQL 8.4 binaries |
| `%LOCALAPPDATA%/Basketwise/mysql-data` | Persistent native database; never remove as cache |
| `%LOCALAPPDATA%/Basketwise/my.ini` | Localhost-only MySQL configuration, port 3307, UTC time zone |
| `%LOCALAPPDATA%/Basketwise/client.ini` | Private administrative database credentials; never commit/share |
| `.env` | Private project database and administrator settings |
| `.runtime/app.log`, `.runtime/app-error.log` | Native application logs |
| `%LOCALAPPDATA%/Basketwise/mysql-error.log` | Database startup/error log |
| `.runtime/backups` | Private migration dump and table-verification manifests |
| `backend/target/basketwise-1.0.0.jar` | Packaged application, including frontend assets |

The scripts deliberately leave the computer's default Java and existing XAMPP/MySQL services alone. They select the private Java 21 path instead of relying on the default Java 8 executable. MySQL runs as the current user, not a newly installed Windows service. Start the project again after a Windows restart.

## Database migration from Docker

The migration on 26 October 2026 stopped writes, exported the `basketwise` database with mysqldump, and imported it into the private native MySQL instance. The database includes development/test records accumulated over time, so total table counts exceed the public active sample catalog. All nine tables were compared using canonical JSON row hashes and counts, with both sessions using UTC. Password hashes and saved-plan snapshot strings are preserved. The private SQL backup was retained before removing the original Docker volume. Existing login sessions expire when the backend restarts; users can sign in with their existing passwords.

Do not copy the old Linux MySQL data directory into Windows. Use a logical SQL export/import. Do not import a backup over a working database without a fresh backup and a deliberate restore decision. Never delete native `mysql-data` during cache cleanup.

## Tests and optional Docker files

`scripts/test.ps1` uses the native JDK for account/comparison unit tests, then runs frontend and browser tests. The new saved-list API tests are part of the full integration suite, not the default unit-only Java run. `scripts/test.ps1 -WithDockerIntegration` still needs Docker for a disposable MySQL Testcontainer. It does not use the application's native database for Java integration tests.

`Dockerfile` and `compose.yml` remain optional, reproducible alternatives. They do not run when using the native scripts. Starting Compose while the native app is running will conflict with the same ports; stop the native app first. After Docker's database volume has been removed, Compose creates a separate fresh database; it does not automatically read native data.
