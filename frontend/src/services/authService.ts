const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export function getDashboardPath(role: string): string | undefined {
  switch (role) {
    case 'HR': return '/rh';
    case 'ADMIN': return '/admin';
    case 'BUSINESS': return '/business';
    default: return undefined;
  }
}

export function getSessionUser(): AuthUser | null {
  const token = sessionStorage.getItem('authToken');
  const storedUser = sessionStorage.getItem('authUser');
  if (!token || !storedUser) return null;

  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(encodedPayload));
    if (typeof exp !== 'number' || !Number.isFinite(exp) || exp * 1000 <= Date.now()) {
      return null;
    }

    const user = JSON.parse(storedUser) as AuthUser | null;
    return typeof user?.role === 'string' ? user : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('authUser');
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'E-mail ou senha inválidos.');
  }

  return data as LoginResponse;
}


export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  invitationToken?: string;
}

export async function register(
  data: RegisterRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      ...(data.invitationToken?.trim()
        ? { invitationToken: data.invitationToken.trim() }
        : {}),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const message = Array.isArray(result.message)
      ? result.message.join(', ')
      : result.message;

    throw new Error(message || 'Não foi possível realizar o cadastro.');
  }

  return result as LoginResponse;
}
