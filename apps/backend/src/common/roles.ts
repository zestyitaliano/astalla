export enum AppRole {
  ORG_ADMIN = 'ORG_ADMIN',
  REGIONAL = 'REGIONAL',
  PROPERTY = 'PROPERTY',
  MARKETING = 'MARKETING',
}

export const ROLE_HIERARCHY: Record<AppRole, AppRole[]> = {
  [AppRole.ORG_ADMIN]: [AppRole.ORG_ADMIN, AppRole.REGIONAL, AppRole.PROPERTY, AppRole.MARKETING],
  [AppRole.REGIONAL]: [AppRole.REGIONAL, AppRole.PROPERTY, AppRole.MARKETING],
  [AppRole.PROPERTY]: [AppRole.PROPERTY],
  [AppRole.MARKETING]: [AppRole.MARKETING],
};
