export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  FRONTEND_URL: string;
};

export type Variables = {
  user: JWTPayload;
};

export type JWTPayload = {
  sub: string;
  username: string;
  jti: string;
  exp: number;
  iat: number;
};

export type User = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  password_hash: string | null;
  avatar_url: string | null;
  bio: string | null;
  accent_color: string;
  social_links: string;
  notification_prefs: string;
  created_at: number;
};

export type Project = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  sub_name: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

export type OC = {
  id: string;
  user_id: string;
  project_id: string | null;
  slug: string;
  name: string;
  rom: string | null;
  species: string | null;
  tagline: string | null;
  card_color: string;
  display_mode: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  profile_fields: string;
  swatches: string;
  checklist: string;
  license: string;
  markers: string;
  visibility: string;
  password_hash: string | null;
  created_at: number;
  updated_at: number;
};

export type OCMedia = {
  id: string;
  oc_id: string;
  category: string;
  url: string;
  r2_key: string | null;
  caption: string | null;
  sort_order: number;
  created_at: number;
};

export type Relationship = {
  id: string;
  user_id: string;
  oc_a_id: string;
  oc_b_id: string;
  label: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

export type WorldviewEntry = {
  id: string;
  user_id: string;
  project_id: string | null;
  slug: string;
  name: string;
  en_name: string | null;
  type: string | null;
  blurb: string | null;
  setting: string | null;
  linked_oc_ids: string;
  gallery_labels: string;
  created_at: number;
  updated_at: number;
};

export type WorldviewRel = {
  id: string;
  entry_id: string;
  target_entry_id: string;
  kind: string;
};

export function errorResponse(c: any, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status as any);
}
