const userSockets = new Map();
const pendingAccpetRequests = new Map(); // [code] -> { resolve, timer }

function initSockets(io) {
    io.on("connection", (socket) => {
        socket.on("register", (userId) => {
            userSockets.set(userId, socket);
            socket.emit("register_response");
        });

        socket.on("accept-ok", (data) => {
            const code = data
            if (pendingAccpetRequests.has(code)) {
                const { resolve, timer } = pendingAccpetRequests.get(code);
                clearTimeout(timer);
                pendingAccpetRequests.delete(code);
                resolve(true);
            }
        });

        socket.on("disconnect", () => {
            for (const [userId, id] of userSockets.entries()) {
                if (id === socket.id) {
                    userSockets.delete(userId);
                    break;
                }
            }
        });
    });
}

function waitForUserAccept(code, timeoutMs = 30000) {
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

function getSocketId(userId) {
    return userSockets.get(userId);
}

export { initSockets, getSocketId, waitForUserAccept };