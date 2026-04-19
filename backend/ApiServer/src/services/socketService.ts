import type { Server } from "socket.io";

const userSockets = new Map<string, string>();
const pendingAccpetRequests = new Map<string, { resolve: (value: boolean) => void, timer: NodeJS.Timeout }>(); // [code] -> { resolve, timer }
let socketServer: Server | null = null;

function initSockets(io: Server) {
    socketServer = io;

    io.on("connection", (socket) => {
        socket.on("register", (userId: string) => {
            userSockets.set(userId, socket.id);
            socket.emit("register_response");
        });

        socket.on("accept-ok", (data: string) => {
            const code = data
            if (pendingAccpetRequests.has(code)) {
                const pendingRequest = pendingAccpetRequests.get(code);
                if (!pendingRequest) {
                    return;
                }

                const { resolve, timer } = pendingRequest;
                clearTimeout(timer);
                pendingAccpetRequests.delete(code);
                resolve(true);
            }
        });


        socket.on("accept-decline", (data: string) => {
            const code = data
            if (pendingAccpetRequests.has(code)) {
                const pendingRequest = pendingAccpetRequests.get(code);
                if (!pendingRequest) {
                    return;
                }

                const { resolve, timer } = pendingRequest;
                clearTimeout(timer);
                pendingAccpetRequests.delete(code);
                resolve(false);
            }
        });

        socket.on("disconnect", () => {
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
        });
    });
}

function waitForUserAccept(code: string, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            if (pendingAccpetRequests.has(code)) {
                pendingAccpetRequests.delete(code);
                resolve(false);
            }
        }, timeoutMs);

        pendingAccpetRequests.set(code, { resolve, timer });
    });
}

function getSocketId(userId: string) {
    return userSockets.get(userId);
}

function emitToUser(userId: string, eventName: string, payload: unknown): boolean {
    if (!socketServer) {
        return false;
    }

    const socketId = userSockets.get(userId);
    if (!socketId) {
        return false;
    }

    socketServer.to(socketId).emit(eventName, payload);
    return true;
}

export { initSockets, getSocketId, waitForUserAccept, emitToUser };