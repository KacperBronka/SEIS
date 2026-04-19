import express from "express"
import http from "http"
import path from "path";
import config from "./config.js"
import { createSocketServer } from "./middleware/socketServer.js"
import { initSockets } from "./services/socketService.js"
import { startGarbageCollector } from "./services/codeService.js";
import { runMigrations } from "./services/migrationService.js";
import { ValidationError } from "express-validation";
import appRouter from "./api/index.js";
import requestLogger from "./middleware/requestLogger.js";

const app = express();
const {PORT, HOST} = config

app.use(requestLogger);
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const server = http.createServer({}, app); 

export const io = createSocketServer(server);

app.use(appRouter)

app.use("/public", express.static(path.join(process.cwd(), "src/public")))

app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
        return res.status(err.statusCode).json(err)
    }

    return res.status(500).json(err)
})

async function startServer(): Promise<void> {
    await runMigrations();

    initSockets(io)
    startGarbageCollector(config.CODE_GARBAGE_COLLECTOR_INTERVAL)

    server.listen(PORT, HOST, () => {
        console.log(`App listening on https://${HOST}:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});