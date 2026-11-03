
const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type UserRole = 'HR' | 'ADMIN' | 'BUSINESS' | 'USER';

export type InvitationRole = 'HR' | 'ADMIN' | 'BUSINESS';

export interface ManagementUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  expiresAt: string;
  createdAt: string;
}

export interface CreatedInvitation extends Invitation {
  token: string;
}


export class ManagementApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ManagementApiError';
    this.status = status;
  }
}


async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem('authToken');

  if (!token) {
    throw new ManagementApiError(
      'Sua sessão expirou. Faça login novamente.',
      401,
    );
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = data as { message?: string | string[] } | null;

    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;

    throw new ManagementApiError(
      message || 'Não foi possível concluir a operação.',
      response.status,
    );
  }

  return data as T;
}

// Convites

export function getInvitations(): Promise<Invitation[]> {
  return apiRequest<Invitation[]>('/invitations');
}

export function createInvitation(
  email: string,
  role: InvitationRole,
): Promise<CreatedInvitation> {
  return apiRequest<CreatedInvitation>('/invitations', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      role,
    }),
  });
}

export function revokeInvitation(
  id: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest(`/invitations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Usuários

export function getUsers(
  role: UserRole,
): Promise<ManagementUser[]> {
  return apiRequest<ManagementUser[]>(
    `/users?role=${encodeURIComponent(role)}`,
  );
}

export function deactivateUser(
  id: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest(`/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function activateUser(
  id: string,
): Promise<{ success: boolean; id: string }> {
  return apiRequest(
    `/users/${encodeURIComponent(id)}/activate`,
    {
      method: 'PATCH',
    },
  );
}
