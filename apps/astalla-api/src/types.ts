export interface Site {
  id: string;
  label: string;
  baseUrl: string;
  secret: string;
  lastSyncAt: string | null;
}
