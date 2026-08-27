export type AppRole = 'ADMIN' | 'SUPERVISOR' | 'OPERARIO';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: AppRole | string;
};

export function getRole(user?: AuthUser | null): AppRole | null {
  const role = user?.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'OPERARIO') {
    return role;
  }
  return null;
}

/** Administrador del sistema */
export function isAdmin(user?: AuthUser | null): boolean {
  return getRole(user) === 'ADMIN';
}

/** Puede gestionar estados/kanban y ver analítica avanzada */
export function isManager(user?: AuthUser | null): boolean {
  const role = getRole(user);
  return role === 'ADMIN' || role === 'SUPERVISOR';
}

/** Operador de campo (sin gestión administrativa) */
export function isOperario(user?: AuthUser | null): boolean {
  return getRole(user) === 'OPERARIO';
}

export function getRoleLabel(user?: AuthUser | null): string {
  const role = getRole(user);
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'OPERARIO':
      return 'Operador';
    default:
      return 'Usuario';
  }
}
