/**
 * Types for WordPress REST API & PressPulse Mobile Editor
 */

export type PostStatus = 'publish' | 'draft' | 'pending' | 'future' | 'private';

export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: PostStatus;
  type: string;
  link: string;
  title: {
    raw?: string;
    rendered: string;
  };
  content: {
    raw?: string;
    rendered: string;
    protected?: boolean;
    block_version?: number;
  };
  excerpt: {
    raw?: string;
    rendered: string;
    protected?: boolean;
  };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  // Yoast SEO fields if exposed by Yoast REST API
  yoast_head_json?: {
    title?: string;
    description?: string;
    canonical?: string;
    og_title?: string;
    og_description?: string;
  };
  meta?: {
    _yoast_wpseo_title?: string;
    _yoast_wpseo_metadesc?: string;
    _yoast_wpseo_focuskw?: string;
    [key: string]: unknown;
  };
}

export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface WordPressMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    raw?: string;
    rendered: string;
  };
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  source_url: string;
  media_details?: {
    width?: number;
    height?: number;
    file?: string;
    sizes?: {
      thumbnail?: { source_url: string; width: number; height: number };
      medium?: { source_url: string; width: number; height: number };
      large?: { source_url: string; width: number; height: number };
      full?: { source_url: string; width: number; height: number };
      [key: string]: { source_url: string; width: number; height: number } | undefined;
    };
  };
}

export interface WordPressUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls?: Record<string, string>;
  capabilities?: Record<string, boolean>;
  roles?: string[];
}

export interface ConnectionConfig {
  siteUrl: string; // e.g. https://myblog.com
  username: string;
  appPassword: string; // 24-character Application Password or without spaces
  rememberCredentials: boolean; // session-only vs persistent
  useProxy?: boolean; // optional CORS workaround proxy
}

export interface YoastSeoData {
  focusKeyword: string;
  seoTitle: string;
  slug: string;
  metaDescription: string;
}

export interface LocalDraft {
  localId: string; // generated UUID or "post_123"
  postId?: number; // WordPress post ID if editing existing
  title: string;
  content: string; // Clean HTML or Block structure
  originalServerContent?: string; // For conflict comparison
  status: PostStatus;
  categories: number[];
  featuredMediaId: number;
  featuredMediaUrl?: string;
  seo: YoastSeoData;
  lastLocalModified: number; // timestamp
  lastKnownServerModifiedGmt?: string; // ISO string from WP modified_gmt
  hasUnsavedChanges: boolean;
  preservedBlocksNote?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  isCorsError?: boolean;
  isAuthError?: boolean;
  isPermissionError?: boolean;
  rawDetails?: unknown;
}
