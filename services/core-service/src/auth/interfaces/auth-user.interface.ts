/** Bentuk objek user yang ditempel ke request setelah JWT tervalidasi. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  /** Tenant pemilik user. null untuk SuperAdmin (level platform). */
  organizationId: string | null;
}
