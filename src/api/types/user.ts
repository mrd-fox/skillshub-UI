/**
 * User and profile types
 */

export type RoleResponse = {
    name: string;
};

export type InternalUserResponse = {
    id: string;
    externalId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    active: boolean;
    roles: RoleResponse[];
};

export type InternalUserEnvelope = {
    created: boolean;
    user: InternalUserResponse;
};

export type InternalUser = {
    id: string;
    keycloakId: string;
    email: string;
    roles: string[];
    firstName?: string | null;
    lastName?: string | null;
    active?: boolean;
};
