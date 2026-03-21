import config from "../config.js"

const activeCodes = []

export function generateCode(user, socketId) {
    const codeIndex = activeCodes.findIndex(t => t.user === user);

    if (codeIndex !== -1) {
        const currentData = activeCodes[codeIndex];

        if (Date.now() > currentData.endoflife) {
            activeCodes.splice(codeIndex, 1);
        } else {
            currentData.endoflife = Date.now() + config.CODE_LIFESPAN;
            currentData.socketId = socketId; 
            return currentData.code;
        }
    }

    let code;

    do {
        code = Math.floor(Math.random() * 900000) + 100000; 
    } while(activeCodes.some(t => t.code === code));

    const c = { user, code, endoflife: Date.now() + config.CODE_LIFESPAN, socketId };
    activeCodes.push(c);

    return code;
}

export function clearCode(user) {
    const i = activeCodes.findIndex(t => t.user === user)
    if (i === -1) return;

    activeCodes.splice(i, 1)
}

export function getCodeData(code){
    const i = activeCodes.findIndex(t => t.code == code)
    if (i === -1) return null;

    const data = activeCodes[i]
    if (Date.now() >= data.endoflife) {
        clearCode(data.user)
        return null
    }
    
    return activeCodes[i]
}

export function startGarbageCollector(intervalMs = 60000) {
    setInterval(() => {
        const now = Date.now();
        
        for (let i = activeCodes.length - 1; i >= 0; i--) {
            if (now >= activeCodes[i].endoflife) {
                activeCodes.splice(i, 1);
            }
        }
    }, intervalMs);
}