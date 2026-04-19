export type FamilyRole = "parent" | "child";
export type PendingRequestStatus = "pending" | "approved" | "declined";

export type Family = {
    id: number,
    family_name: string,
    parent_id: string,
    parent_email: string,
    join_code: string,
};

export type FamilyMember = {
    id_uid: string,
    name: string,
    role: FamilyRole,
};

export type PendingRequest = {
    child_id: string,
    name: string,
};

export type FamilyStatusResponse = {
    in_family: boolean,
    family_id: number | null,
    family_name: string | null,
    role: "parent" | "child" | null,
    members: Array<{ id_uid: string, name: string, role: "parent" | "child" }>,
    pending_requests: Array<{ id_uid: string, name: string }>,
    join_code?: string,
};