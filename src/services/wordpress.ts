/**
 * WordPress REST API Service
 * Handles authenticated communication with WordPress sites via Application Passwords.
 */

import {
  ApiError,
  ConnectionConfig,
  PostStatus,
  WordPressCategory,
  WordPressMedia,
  WordPressPost,
  WordPressUser,
  YoastSeoData,
} from '../types/wordpress';

export function normalizeSiteUrl(input: string): string {
  let url = input.trim();
  if (!url) return '';

  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If user pasted .../wp-json or .../wp-admin, clean it up
  url = url.replace(/\/wp-json.*$/i, '');
  url = url.replace(/\/wp-admin.*$/i, '');

  return url;
}

export function cleanAppPassword(pass: string): string {
  // WordPress displays application passwords with spaces (e.g. "xxxx xxxx xxxx xxxx")
  // Both formatted with or without spaces are valid, but removing spaces prevents copy-paste errors
  return pass.replace(/\s+/g, '');
}

export function parseApiError(err: unknown, url?: string): ApiError {
  if (err instanceof Error) {
    const msg = err.message || '';

    // Check for CORS or Network error
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed') ||
      err.name === 'TypeError'
    ) {
      return {
        message:
          'Network or CORS restriction detected. The WordPress site may be blocking browser requests from another origin, or the URL/SSL certificate is invalid.',
        isCorsError: true,
        code: 'NETWORK_OR_CORS_ERROR',
        rawDetails: { url, originalMessage: msg },
      };
    }

    return {
      message: msg,
      rawDetails: err,
    };
  }

  return {
    message: 'An unknown error occurred while communicating with WordPress.',
    rawDetails: err,
  };
}

class WordPressService {
  private getAuthHeader(config: ConnectionConfig): string {
    const cleanPass = cleanAppPassword(config.appPassword);
    const token = btoa(`${config.username}:${cleanPass}`);
    return `Basic ${token}`;
  }

  private getBaseApiUrl(siteUrl: string): string {
    return `${normalizeSiteUrl(siteUrl)}/wp-json`;
  }

  private async request<T>(
    config: ConnectionConfig,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; headers: Headers }> {
    const baseUrl = this.getBaseApiUrl(config.siteUrl);
    const fullUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', this.getAuthHeader(config));
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // Response was not JSON
        }

        const status = response.status;
        let message = errorData?.message || response.statusText || `HTTP Error ${status}`;

        // Clean WordPress HTML error tags if returned
        message = message.replace(/<[^>]+>/g, '').trim();

        const err: ApiError = {
          message,
          status,
          code: errorData?.code,
          rawDetails: errorData,
        };

        if (status === 401) {
          err.isAuthError = true;
          err.message =
            'Authentication failed. Please check your WordPress username and Application Password.';
        } else if (status === 403) {
          err.isPermissionError = true;
          err.message =
            'Permission denied. Your WordPress user account lacks permission for this action (requires editor/author privileges).';
        } else if (status === 404) {
          err.message =
            'REST API endpoint not found. Verify the site URL and ensure WordPress permalinks are enabled (not "Plain").';
        }

        throw err;
      }

      const data = (await response.json()) as T;
      return { data, headers: response.headers };
    } catch (err: any) {
      if (err?.message && (err.isAuthError || err.isPermissionError || err.status)) {
        throw err;
      }
      throw parseApiError(err, fullUrl);
    }
  }

  /**
   * Test connection to WordPress and verify user permissions
   */
  async testConnection(config: ConnectionConfig): Promise<{
    user: WordPressUser;
    siteName?: string;
    hasYoastCompanion: boolean;
  }> {
    // 1. Fetch current user
    const { data: user } = await this.request<WordPressUser>(config, '/wp/v2/users/me?context=edit');

    // 2. Fetch site info to confirm REST root
    let siteName = '';
    try {
      const { data: rootInfo } = await this.request<any>(config, '/');
      siteName = rootInfo?.name || '';
    } catch {
      // Non-fatal
    }

    // 3. Check if Companion Plugin is present
    let hasYoastCompanion = false;
    try {
      const { data: comp } = await this.request<any>(config, '/presspulse/v1/ping');
      if (comp && comp.status === 'ok') {
        hasYoastCompanion = true;
      }
    } catch {
      hasYoastCompanion = false;
    }

    return { user, siteName, hasYoastCompanion };
  }

  /**
   * Retrieve posts with search, filter, pagination
   */
  async getPosts(
    config: ConnectionConfig,
    params: {
      search?: string;
      status?: PostStatus | 'any';
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<{ posts: WordPressPost[]; totalPosts: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('context', 'edit');
    searchParams.set('page', String(params.page || 1));
    searchParams.set('per_page', String(params.perPage || 10));

    if (params.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }

    if (params.status && params.status !== 'any') {
      searchParams.set('status', params.status);
    } else {
      // By default fetch publish, draft, pending
      searchParams.set('status', 'publish,draft,pending,future,private');
    }

    const { data: posts, headers } = await this.request<WordPressPost[]>(
      config,
      `/wp/v2/posts?${searchParams.toString()}`
    );

    const totalPosts = parseInt(headers.get('x-wp-total') || '0', 10) || posts.length;
    const totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10) || 1;

    return { posts, totalPosts, totalPages };
  }

  /**
   * Get single post with raw content for editing
   */
  async getPost(config: ConnectionConfig, id: number): Promise<WordPressPost> {
    const { data } = await this.request<WordPressPost>(config, `/wp/v2/posts/${id}?context=edit`);
    return data;
  }

  /**
   * Create new WordPress post
   */
  async createPost(
    config: ConnectionConfig,
    payload: {
      title: string;
      content: string;
      status: PostStatus;
      categories?: number[];
      featured_media?: number;
      slug?: string;
      meta?: Record<string, any>;
    }
  ): Promise<WordPressPost> {
    const cleanPayload: any = { ...payload };
    if (!cleanPayload.featured_media || cleanPayload.featured_media <= 0) {
      delete cleanPayload.featured_media;
    }
    if (!cleanPayload.categories || cleanPayload.categories.length === 0) {
      delete cleanPayload.categories;
    }
    if (!cleanPayload.slug || !cleanPayload.slug.trim()) {
      delete cleanPayload.slug;
    }

    const { data } = await this.request<WordPressPost>(config, '/wp/v2/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanPayload),
    });
    return data;
  }

  /**
   * Update existing WordPress post
   */
  async updatePost(
    config: ConnectionConfig,
    id: number,
    payload: {
      title?: string;
      content?: string;
      status?: PostStatus;
      categories?: number[];
      featured_media?: number;
      slug?: string;
      meta?: Record<string, any>;
    }
  ): Promise<WordPressPost> {
    const cleanPayload: any = { ...payload };
    if (cleanPayload.slug !== undefined && !cleanPayload.slug.trim()) {
      delete cleanPayload.slug;
    }

    const { data } = await this.request<WordPressPost>(config, `/wp/v2/posts/${id}`, {
      method: 'POST', // WordPress REST API accepts POST to /wp/v2/posts/{id} for updates
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanPayload),
    });
    return data;
  }

  /**
   * Fetch categories
   */
  async getCategories(
    config: ConnectionConfig,
    params: { search?: string; perPage?: number } = {}
  ): Promise<WordPressCategory[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('per_page', String(params.perPage || 100));
    searchParams.set('orderby', 'count');
    searchParams.set('order', 'desc');
    if (params.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }

    const { data } = await this.request<WordPressCategory[]>(
      config,
      `/wp/v2/categories?${searchParams.toString()}`
    );
    return data;
  }

  /**
   * Upload media file to WordPress Media Library with upload progress
   */
  async uploadMedia(
    config: ConnectionConfig,
    file: File,
    title?: string,
    altText?: string,
    onProgress?: (percent: number) => void
  ): Promise<WordPressMedia> {
    const baseUrl = this.getBaseApiUrl(config.siteUrl);
    const fullUrl = `${baseUrl}/wp/v2/media`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', fullUrl);
      xhr.setRequestHeader('Authorization', this.getAuthHeader(config));
      xhr.setRequestHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('Accept', 'application/json');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const media = JSON.parse(xhr.responseText) as WordPressMedia;

            // If altText or title specified, update the media item metadata
            if ((altText || title) && media.id) {
              try {
                const updatePayload: Record<string, string> = {};
                if (altText) updatePayload.alt_text = altText;
                if (title) updatePayload.title = title;

                const { data: updatedMedia } = await this.request<WordPressMedia>(
                  config,
                  `/wp/v2/media/${media.id}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload),
                  }
                );
                resolve(updatedMedia);
                return;
              } catch {
                // Return media even if meta update had minor issue
                resolve(media);
                return;
              }
            }

            resolve(media);
          } catch (e) {
            reject(new Error('Failed to parse media upload response.'));
          }
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            reject(parseApiError(new Error(errJson.message || `Media upload failed: ${xhr.status}`), fullUrl));
          } catch {
            reject(new Error(`Media upload failed with HTTP status ${xhr.status}.`));
          }
        }
      };

      xhr.onerror = () => {
        reject(
          parseApiError(
            new Error('Network error or CORS restriction during media upload.'),
            fullUrl
          )
        );
      };

      xhr.send(file);
    });
  }

  /**
   * Browse media library
   */
  async getMediaList(
    config: ConnectionConfig,
    params: { page?: number; perPage?: number; search?: string } = {}
  ): Promise<{ media: WordPressMedia[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('media_type', 'image');
    searchParams.set('page', String(params.page || 1));
    searchParams.set('per_page', String(params.perPage || 20));
    if (params.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }

    const { data, headers } = await this.request<WordPressMedia[]>(
      config,
      `/wp/v2/media?${searchParams.toString()}`
    );

    const total = parseInt(headers.get('x-wp-total') || '0', 10) || data.length;
    return { media: data, total };
  }

  /**
   * Update Yoast SEO Metadata
   * Attempts companion plugin endpoint first, then standard REST meta keys.
   */
  async updateYoastSeo(
    config: ConnectionConfig,
    postId: number,
    seo: YoastSeoData
  ): Promise<{ success: boolean; method: 'companion' | 'meta' | 'none'; message?: string }> {
    // 1. Try PressPulse Yoast Companion endpoint
    try {
      const { data } = await this.request<any>(config, `/presspulse/v1/yoast/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_keyword: seo.focusKeyword,
          seo_title: seo.seoTitle,
          meta_description: seo.metaDescription,
          slug: seo.slug,
        }),
      });

      if (data && data.success) {
        return { success: true, method: 'companion' };
      }
    } catch {
      // Companion endpoint not installed or failed, proceed to standard meta
    }

    // 2. Try standard WordPress post meta update
    try {
      const metaPayload: Record<string, string> = {
        _yoast_wpseo_focuskw: seo.focusKeyword,
        _yoast_wpseo_title: seo.seoTitle,
        _yoast_wpseo_metadesc: seo.metaDescription,
      };

      await this.updatePost(config, postId, {
        meta: metaPayload,
        slug: seo.slug || undefined,
      });

      return { success: true, method: 'meta' };
    } catch (err: any) {
      return {
        success: false,
        method: 'none',
        message: err.message || 'Could not persist Yoast SEO metadata directly.',
      };
    }
  }
}

export const wordPressService = new WordPressService();
