import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import config from "../config.js";

const migrationsDir = path.join(process.cwd(), "src/db/migrations");

export async function runMigrations(): Promise<void> {
    const connection = await mysql.createConnection({
        host: config.DB_HOST,
        port: config.DB_PORT,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_DATABASE,
        multipleStatements: true,
    });

    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [appliedRows] = await connection.execute("SELECT name FROM schema_migrations");
        const appliedMigrations = new Set(
            Array.isArray(appliedRows)
                ? (appliedRows as Array<{ name: string }>).map((row) => row.name)
                : []
        );

        const migrationFiles = (await fs.readdir(migrationsDir))
            .filter((file) => file.endsWith(".sql"))
            .sort();

        for (const fileName of migrationFiles) {
            if (appliedMigrations.has(fileName)) {
                continue;
            }

            const filePath = path.join(migrationsDir, fileName);
            const migrationSql = await fs.readFile(filePath, "utf8");

            if (!migrationSql.trim()) {
                continue;
            }

            await connection.beginTransaction();
            try {
                await connection.query(migrationSql);
                await connection.execute(
                    "INSERT INTO schema_migrations (name) VALUES (?)",
                    [fileName]
                );
                await connection.commit();
                console.log(`[migration] Applied ${fileName}`);
            } catch (error) {
                await connection.rollback();
                throw error;
            }
        }
    } finally {
        await connection.end();
    }
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryFilePath === currentFilePath) {
    runMigrations().catch((error) => {
        console.error("[migration] Failed", error);
        process.exit(1);
    });
}
