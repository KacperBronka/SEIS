import express from "express"
import morgan from "morgan"
import http from "http"
import { Server } from "socket.io";
import { usersRouter } from "./api/users.js"
import config from "./config.js"
import { initSockets } from "./services/socketService.js"
import { loadData } from "./services/databaseService.js"
import { startGarbageCollector } from "./services/codeService.js";

loadData()

const app = express();
const port = config.PORT;

const options = {}

app.use(morgan("dev"));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use("/users/",usersRouter)

app.get("/", (req, res) => {
    res.send({error: null, status: "ok", message: "SEIS is up and running"});
});

const server = http.createServer(options, app); //https

export const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

initSockets(io)

startGarbageCollector(config.CODE_GARBAGE_COLLECTOR_INTERVAL)

server.listen(port, () => {
    console.log(`App listening on https://localhost:${port}`);
});