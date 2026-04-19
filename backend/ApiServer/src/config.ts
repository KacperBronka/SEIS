import "dotenv/config";

export default {
    // Server configuration
    PORT: Number(process.env.PORT ?? 80),
    HOST: process.env.HOST ?? "0.0.0.0",

    // Database configuration
    DB_HOST: process.env.DB_HOST ?? "mariadb",
    DB_PORT: Number(process.env.DB_PORT ?? 3307),
    DB_USER: process.env.DB_USER ?? "seis",
    DB_PASSWORD: process.env.DB_PASSWORD ?? "seis_password",
    DB_DATABASE: process.env.DB_DATABASE ?? "seis",

    // Mail configuration
    MAIL_FROM: process.env.MAIL_FROM!,

    // App configuration
    CODE_LIFESPAN: Number(process.env.CODE_LIFESPAN ?? 5 * 60 * 1000),
    CODE_GARBAGE_COLLECTOR_INTERVAL: Number(process.env.CODE_GARBAGE_COLLECTOR_INTERVAL ?? 10 * 1000),
}
