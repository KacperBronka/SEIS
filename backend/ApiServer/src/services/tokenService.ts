import type { User } from "../types/User.js";

import { saveActivity } from "./databaseService.js";

function generateUniqueToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createAndSaveToken(user: User, verification_status: boolean): string {
    const token = generateUniqueToken();
    
    saveActivity(user, verification_status, token);

    return token;
}