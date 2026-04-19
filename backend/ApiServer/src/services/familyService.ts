import type { PendingRequest, PendingRequestStatus } from "../types/Family.js";
import {
    addFamilyMember,
    createFamily,
    getFamilyById,
    getFamilyByJoinCode,
    getFamilyMembers,
    getFamilyMembershipByUserId,
    getPersonalData,
    joinCodeExists,
    removeFamilyMember,
} from "./databaseService.js";
import { type FamilyStatusResponse } from "./../types/Family.js";
import { sendActivityMail } from "./emailService.js";
import { emitToUser } from "./socketService.js";
import { randomBytes } from "crypto";
import type { User } from "../types/User.js";

class FamilyServiceError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function getDisplayName(user: User): string {
    return `${user.name} ${user.surname}`.trim();
}

function pendingRequestKey(familyId: number, childId: string): string {
    return `${familyId}:${childId}`;
}

export async function createFamilyGroup(idUid: string, familyName: string, email: string) {
    const existingMembership = await getFamilyMembershipByUserId(idUid);
    if (existingMembership) {
        throw new FamilyServiceError(409, "User is already a member of a family");
    }

    const family = await createFamily(familyName, idUid, email, "");
    const members = await getFamilyMembers(String(family.id));

    return {
        family_id: family.id,
        family_name: family.family_name,
        join_code: family.join_code,
        role: "parent" as const,
        members,
        pending_requests: [],
        error: null,
    };
}

export async function joinFamilyGroup(idUid: string, joinCode: string) {
    const normalizedCode = String(joinCode).toUpperCase();
    const family = await getFamilyByJoinCode(normalizedCode);
    if (!family) {
        throw new FamilyServiceError(404, "Invalid join code");
    }

    const existingMembership = await getFamilyMembershipByUserId(idUid);
    if (existingMembership) {
        throw new FamilyServiceError(409, "User is already a member of a family");
    }

    const existingRequest = await getPendingRequestRecord(family.id, idUid);
    if (existingRequest?.status === "pending") {
        throw new FamilyServiceError(409, "A pending request already exists for this user");
    }

    await createPendingRequest(family.id, idUid);

    const childUser = await getPersonalData(idUid);
    const childName = childUser ? getDisplayName(childUser) : idUid;

    emitToUser(family.parent_id, "join-request-incoming", {
        child_id: idUid,
        child_name: childName,
        family_id: family.id,
    });

    const parentUser = await getPersonalData(family.parent_id);
    const parentName = parentUser ? getDisplayName(parentUser) : family.parent_id;

    return {
        error: null,
        family_name: family.family_name,
        parent_name: parentName,
    };
}

export async function getFamilyStatus(idUid: string): Promise<FamilyStatusResponse> {
    const membership = await getFamilyMembershipByUserId(idUid);
    if (!membership) {
        return {
            in_family: false,
            family_id: null,
            family_name: null,
            role: null,
            members: [],
            pending_requests: [],
        };
    }

    const family = await getFamilyById(membership.family_id);
    if (!family) {
        throw new Error("Family not found for membership");
    }

    const members = await getFamilyMembers(family.id);

    if (membership.role === "parent") {
        const pendingRequestsRaw = await getPendingRequestsForFamily(family.id);
        const pendingRequests = pendingRequestsRaw.map((request) => ({
            id_uid: request.child_id,
            name: request.name,
        }));

        return {
            in_family: true,
            family_id: family.id,
            family_name: family.family_name,
            role: membership.role,
            join_code: family.join_code,
            members,
            pending_requests: pendingRequests,
        };
    }

    return {
        in_family: true,
        family_id: family.id,
        family_name: family.family_name,
        role: membership.role,
        members,
        pending_requests: [],
    };
}

export async function approveFamilyJoin(parentId: string, childId: string, familyId: string | number) {
    const family = await getFamilyById(familyId);
    if (!family || family.parent_id !== parentId) {
        throw new FamilyServiceError(403, "Unauthorized: you are not the parent of this family");
    }

    const pendingRequest = await getPendingRequestRecord(familyId, childId);
    if (!pendingRequest || pendingRequest.status !== "pending") {
        throw new FamilyServiceError(404, "No pending request found for this child");
    }

    await setPendingRequestStatus(familyId, childId, "approved");

    const childMembership = await getFamilyMembershipByUserId(childId);
    if (!childMembership) {
        await addFamilyMember(familyId, childId, "child");
    }

    emitToUser(childId, "join-approved", {
        family_id: familyId,
        family_name: family.family_name,
    });

    return { ok: true, error: null };
}

export async function declineFamilyJoin(parentId: string, childId: string, familyId: string | number) {
    const family = await getFamilyById(familyId);
    if (!family || family.parent_id !== parentId) {
        throw new FamilyServiceError(403, "Unauthorized: you are not the parent of this family");
    }

    const pendingRequest = await getPendingRequestRecord(familyId, childId);
    if (!pendingRequest || pendingRequest.status !== "pending") {
        throw new FamilyServiceError(404, "No pending request found for this child");
    }

    await setPendingRequestStatus(familyId, childId, "declined");

    emitToUser(childId, "join-declined", {
        family_id: familyId,
        reason: "Request declined by parent",
    });

    return { ok: true, error: null };
}

export async function removeFamilyMemberFromFamily(parentId: string, childId: string) {
    const parentMembership = await getFamilyMembershipByUserId(parentId);
    if (!parentMembership || parentMembership.role !== "parent") {
        throw new FamilyServiceError(403, "Unauthorized: you are not the parent of this family");
    }

    const family = await getFamilyById(parentMembership.family_id);
    if (!family || family.parent_id !== parentId) {
        throw new FamilyServiceError(403, "Unauthorized: you are not the parent of this family");
    }

    if (childId === parentId) {
        throw new FamilyServiceError(400, "Family owner cannot be removed");
    }

    const childMembership = await getFamilyMembershipByUserId(childId);
    if (!childMembership || String(childMembership.family_id) !== String(family.id)) {
        throw new FamilyServiceError(404, "Child is not a member of this family");
    }

    if (childMembership.role === "parent") {
        throw new FamilyServiceError(400, "Family owner cannot be removed");
    }

    const removed = await removeFamilyMember(family.id, childId);
    if (!removed) {
        throw new FamilyServiceError(404, "Child is not a member of this family");
    }

    emitToUser(childId, "member-removed", {
        family_id: family.id,
        family_name: family.family_name,
    });

    return { ok: true, error: null };
}

const pendingRequests = new Map<string, PendingRequestStatus>();
const JOIN_CODE_LENGTH = 8;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function toFamilyId(value: string | number): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function generateJoinCode(length = JOIN_CODE_LENGTH): string {
    const bytes = randomBytes(length);
    let code = "";
    for (const value of bytes) {
        code += JOIN_CODE_ALPHABET[value % JOIN_CODE_ALPHABET.length];
    }

    return code;
}

function normalizeJoinCode(joinCode: string): string {
    return String(joinCode).trim().toUpperCase();
}

async function generateUniqueJoinCode(): Promise<string> {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidate = generateJoinCode();
        const exists = await joinCodeExists(candidate);
        if (!exists) {
            return candidate;
        }
    }

    throw new Error("Failed to generate a unique join code");
}


export async function getPendingRequestRecord(familyId: string | number, childId: string): Promise<{ id: string, status: PendingRequestStatus } | null> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        return null;
    }

    const key = pendingRequestKey(normalizedFamilyId, childId);
    const status = pendingRequests.get(key);
    if (!status) {
        return null;
    }

    return { id: key, status };
}

export async function createPendingRequest(familyId: string | number, childId: string): Promise<void> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        throw new Error("Invalid family id");
    }

    pendingRequests.set(pendingRequestKey(normalizedFamilyId, childId), "pending");
}

export async function setPendingRequestStatus(familyId: string | number, childId: string, status: PendingRequestStatus): Promise<void> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        throw new Error("Invalid family id");
    }

    const key = pendingRequestKey(normalizedFamilyId, childId);
    const currentStatus = pendingRequests.get(key);
    if (currentStatus === "pending") {
        pendingRequests.set(key, status);
    }
}

export async function getPendingRequestsForFamily(familyId: string | number): Promise<PendingRequest[]> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        return [];
    }

    const pendingChildIds = Array.from(pendingRequests.entries())
        .filter(([key, status]) => key.startsWith(`${normalizedFamilyId}:`) && status === "pending")
        .map(([key]) => key.split(":")[1]);

    const requests = await Promise.all(pendingChildIds.map(async (childId) => {
        const user = await getPersonalData(childId);

        if (!user) { 
            throw new Error(`User with id(${childId}) not found while fetching pending requests for family(${familyId})`);
        }

         return {
            child_id: childId,
            name: getDisplayName(user),
        };
    }));

    return requests;
}

export async function sendFamilyActivityNotification(user: User, service: string): Promise<boolean> {
    const membership = await getFamilyMembershipByUserId(user.gov_id);
    if (!membership || membership.role !== "child") {
        return false;
    }

    await sendActivityMail(user, service);
    return true;
}


export { FamilyServiceError, toFamilyId, generateUniqueJoinCode, normalizeJoinCode };
