import mysql from "mysql2/promise"
import { randomBytes } from "crypto";
import config from "../config.js"
import type { User } from "../types/User.js"
import { toFamilyId, normalizeJoinCode, generateUniqueJoinCode } from "./familyService.js";
import type { Family, FamilyMember, FamilyRole } from "../types/Family.js";

const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
})

export async function getPersonalData(uid: string): Promise<User | null> {
    const [rows] = await connection.execute("SELECT id, gov_id, name, surname, pesel FROM users WHERE gov_id = ?", [uid]);
    if (!(Array.isArray(rows) && rows.length > 0)) {
        return null;
    }

    const user = rows[0] as User;
    return user
}

async function getUserByInternalId(id: number): Promise<User | null> {
    const [rows] = await connection.execute("SELECT id, gov_id, name, surname, pesel FROM users WHERE id = ? LIMIT 1", [id]);
    if (!(Array.isArray(rows) && rows.length > 0)) {
        return null;
    }

    return rows[0] as User;
}

export async function getFamilyMembershipByUserId(idUid: string): Promise<{ family_id: string, role: FamilyRole } | null> {
    const user = await getPersonalData(idUid);
    if (!user) {
        return null;
    }

    const [rows] = await connection.execute(
        "SELECT family_id FROM family_members WHERE user_id = ? LIMIT 1",
        [user.id]
    );

    if (Array.isArray(rows) && rows.length > 0) {
        const familyId = Number((rows[0] as { family_id: number }).family_id);
        const family = await getFamilyById(String(familyId));
        if (!family) {
            return null;
        }

        return {
            family_id: String(family.id),
            role: family.parent_id === idUid ? "parent" : "child",
        };
    }

    const [ownerRows] = await connection.execute(
        "SELECT id FROM families WHERE owner_id = ? LIMIT 1",
        [user.id]
    );

    if (!(Array.isArray(ownerRows) && ownerRows.length > 0)) {
        return null;
    }

    return {
        family_id: String((ownerRows[0] as { id: number }).id),
        role: "parent",
    };
}

export async function getFamilyByJoinCode(joinCode: string): Promise<Family | null> {
    const normalizedCode = normalizeJoinCode(joinCode);
    if (!/^[A-Z0-9]{1,12}$/.test(normalizedCode)) {
        return null;
    }

    const [rows] = await connection.execute(
        "SELECT id, owner_id, owner_email, name, join_code FROM families WHERE join_code = ? LIMIT 1",
        [normalizedCode]
    );

    if (!(Array.isArray(rows) && rows.length > 0)) {
        return null;
    }

    const row = rows[0] as { id: number, owner_id: number, owner_email: string, name: string, join_code: string };
    const parentUser = await getUserByInternalId(row.owner_id);

    return {
        id: row.id,
        family_name: row.name,
        parent_id: parentUser?.gov_id ?? String(row.owner_id),
        parent_email: row.owner_email,
        join_code: row.join_code,
    };
}

export async function getFamilyById(familyId: string | number): Promise<Family | null> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        return null;
    }

    const [rows] = await connection.execute(
        "SELECT id, owner_id, owner_email, name, join_code FROM families WHERE id = ? LIMIT 1",
        [normalizedFamilyId]
    );

    if (!(Array.isArray(rows) && rows.length > 0)) {
        return null;
    }

    const row = rows[0] as { id: number, owner_id: number, owner_email: string, name: string, join_code: string };
    const parentUser = await getUserByInternalId(row.owner_id);

    return {
        id: row.id,
        family_name: row.name,
        parent_id: parentUser?.gov_id ?? String(row.owner_id),
        parent_email: row.owner_email,
        join_code: row.join_code,
    };
}

export async function joinCodeExists(joinCode: string): Promise<boolean> {
    const family = await getFamilyByJoinCode(joinCode);
    return family !== null;
}

export async function createFamily(familyName: string, parentId: string, parentEmail: string, joinCode: string): Promise<Family> {
    const parentUser = await getPersonalData(parentId);
    if (!parentUser) {
        throw new Error("Parent user not found");
    }

    let assignedJoinCode = joinCode ? normalizeJoinCode(joinCode) : "";
    if (!assignedJoinCode) {
        assignedJoinCode = await generateUniqueJoinCode();
    }

    let inserted = false;
    let attempts = 0;
    while (!inserted && attempts < 20) {
        try {
            await connection.execute(
                "INSERT INTO families (owner_id, owner_email, name, join_code) VALUES (?, ?, ?, ?)",
                [parentUser.id, parentEmail, familyName, assignedJoinCode]
            );
            inserted = true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("Duplicate entry") && message.includes("join_code")) {
                assignedJoinCode = await generateUniqueJoinCode();
                attempts += 1;
                continue;
            }

            throw error;
        }
    }

    if (!inserted) {
        throw new Error("Failed to create family with a unique join code");
    }

    const [idRows] = await connection.execute("SELECT LAST_INSERT_ID() AS id");
    const familyId = Number((idRows as Array<{ id: number }>)[0]?.id);

    await addFamilyMember(String(familyId), parentId, "parent");

    return {
        id: familyId,
        family_name: familyName,
        parent_id: parentId,
        parent_email: parentEmail,
        join_code: assignedJoinCode,
    };
}

export async function addFamilyMember(familyId: string | number, idUid: string, role: FamilyRole): Promise<void> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        throw new Error("Invalid family id");
    }

    const user = await getPersonalData(idUid);
    if (!user) {
        throw new Error("User not found");
    }

    const [existingRows] = await connection.execute(
        "SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1",
        [normalizedFamilyId, user.id]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
        return;
    }

    await connection.execute(
        "INSERT INTO family_members (family_id, user_id) VALUES (?, ?)",
        [normalizedFamilyId, user.id]
    );
}

export async function removeFamilyMember(familyId: string | number, idUid: string): Promise<boolean> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        throw new Error("Invalid family id");
    }

    const user = await getPersonalData(idUid);
    if (!user) {
        return false;
    }

    const [result] = await connection.execute(
        "DELETE FROM family_members WHERE family_id = ? AND user_id = ?",
        [normalizedFamilyId, user.id]
    );

    const affectedRows = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    return affectedRows > 0;
}

export async function getFamilyMembers(familyId: string | number): Promise<FamilyMember[]> {
    const normalizedFamilyId = toFamilyId(familyId);
    if (!normalizedFamilyId) {
        return [];
    }

    const family = await getFamilyById(String(normalizedFamilyId));
    if (!family) {
        return [];
    }

    const [rows] = await connection.execute(
        "SELECT u.gov_id AS id_uid, u.name, u.surname, u.id AS user_id FROM family_members fm JOIN users u ON u.id = fm.user_id WHERE fm.family_id = ?",
        [normalizedFamilyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    return (rows as Array<{ id_uid: string, name: string, surname: string, user_id: number }>).map((member) => ({
        id_uid: member.id_uid,
        name: `${member.name} ${member.surname}`.trim(),
        role: family.parent_id === member.id_uid ? "parent" : "child",
    }));
}

export async function saveActivity(user: User, verificationSuccessfull: boolean, token: string) {
        await connection.execute(
            "INSERT INTO activity (user_id, verification_successful, token) VALUES (?, ?, ?)",
            [user.id, verificationSuccessfull ? 1 : 0, token]
        );
}