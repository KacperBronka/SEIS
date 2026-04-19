import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

export function createSocketServer(server: HttpServer): Server {
    return new Server(server, {
        cors: {
            origin: "*",
        },
    });
}