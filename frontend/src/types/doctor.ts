import type { ConsentScope } from './consent';
import type { Gender } from './users';

export type PatientSearchResult = {
    id: string;
    fullName: string;
    gender: Gender | string;
}

export type PatientProfile = {
    fullName: string;
    gender: Gender | string;
    dateOfBirth: string | null;
    bloodType: string | null;
    allergies: string | null;
    emergencyContact: string | null;
}

export type RequestAccessForm = {
    patientId: string; 
    requestedScopes: ConsentScope[];
    reason: string;
}

export type RequestAccessResult = {
    requestId: string;
    status: string;
    createdAt: string;
}

export type ManagedPatient = {
    patientId: string;
    fullName: string;
    gender: Gender | string;
    scopes: ConsentScope[];
    grantedAt: string;
    expiresAt: string | null;
    accessStatus: "active" | "expired" | string;
}
