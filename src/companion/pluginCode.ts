/**
 * PressPulse SEO Companion WordPress Plugin (PHP)
 * Complete, secure, drop-in companion plugin for Yoast SEO REST API integration.
 */

export const COMPANION_PLUGIN_VERSION = '1.0.4';

export const COMPANION_PLUGIN_PHP = `<?php
/**
 * Plugin Name: PressPulse SEO Companion
 * Plugin URI: https://github.com/presspulse/presspulse-seo-companion
 * Description: Secure REST API companion plugin for the PressPulse Mobile Editor PWA. Enables authenticated read/write for Yoast SEO metadata and smooth mobile publishing.
 * Version: 1.0.4
 * Author: PressPulse Team
 * Author URI: https://presspulse.app
 * License: GPLv2 or later
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class PressPulse_SEO_Companion {

    const REST_NAMESPACE = 'presspulse/v1';

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('rest_api_init', array($this, 'register_yoast_meta_fields'));
        add_filter('rest_pre_serve_request', array($this, 'send_cors_headers'), 15, 4);
    }

    /**
     * Send CORS headers for mobile PWA connections if needed
     */
    public function send_cors_headers($value, $result, $request, $server) {
        $origin = get_http_origin();
        if ($origin) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Requested-With');
        }
        return $value;
    }

    /**
     * Expose Yoast metadata keys directly in standard /wp/v2/posts endpoint
     */
    public function register_yoast_meta_fields() {
        $yoast_keys = array(
            '_yoast_wpseo_title',
            '_yoast_wpseo_metadesc',
            '_yoast_wpseo_focuskw',
        );

        foreach ($yoast_keys as $meta_key) {
            register_post_meta('post', $meta_key, array(
                'show_in_rest' => true,
                'single'       => true,
                'type'         => 'string',
                'auth_callback' => function() {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => 'sanitize_text_field',
            ));
        }
    }

    /**
     * Register specialized REST endpoints
     */
    public function register_rest_routes() {
        // Ping route: test companion presence
        register_rest_route(self::REST_NAMESPACE, '/ping', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'ping_endpoint'),
            'permission_callback' => '__return_true',
        ));

        // Yoast SEO read/write route for a specific post
        register_rest_route(self::REST_NAMESPACE, '/yoast/(?P<id>\\d+)', array(
            array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_yoast_data'),
                'permission_callback' => array($this, 'check_read_permissions'),
                'args'                => array(
                    'id' => array(
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ),
                ),
            ),
            array(
                'methods'             => 'POST',
                'callback'            => array($this, 'update_yoast_data'),
                'permission_callback' => array($this, 'check_edit_permissions'),
                'args'                => array(
                    'id' => array(
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ),
                    'focus_keyword' => array(
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ),
                    'seo_title' => array(
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ),
                    'meta_description' => array(
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_textarea_field',
                    ),
                    'slug' => array(
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_title',
                    ),
                ),
            ),
        ));
    }

    /**
     * Ping endpoint
     */
    public function ping_endpoint($request) {
        $yoast_active = defined('WPSEO_VERSION');
        return rest_ensure_response(array(
            'status'        => 'ok',
            'plugin'        => 'PressPulse SEO Companion',
            'version'       => '1.0.4',
            'yoast_active'  => $yoast_active,
            'yoast_version' => $yoast_active ? WPSEO_VERSION : null,
            'server_time'   => current_time('mysql'),
        ));
    }

    /**
     * Permission check for reading SEO fields
     */
    public function check_read_permissions($request) {
        $post_id = (int) $request['id'];
        return current_user_can('edit_post', $post_id);
    }

    /**
     * Permission check for updating SEO fields
     */
    public function check_edit_permissions($request) {
        $post_id = (int) $request['id'];
        return current_user_can('edit_post', $post_id);
    }

    /**
     * Get Yoast data for post
     */
    public function get_yoast_data($request) {
        $post_id = (int) $request['id'];
        $post = get_post($post_id);

        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }

        $focus_kw = get_post_meta($post_id, '_yoast_wpseo_focuskw', true);
        $seo_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
        $metadesc  = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);

        return rest_ensure_response(array(
            'post_id'          => $post_id,
            'slug'             => $post->post_name,
            'focus_keyword'    => (string) $focus_kw,
            'seo_title'        => (string) $seo_title,
            'meta_description' => (string) $metadesc,
            'yoast_installed'  => defined('WPSEO_VERSION'),
        ));
    }

    /**
     * Update Yoast data for post
     */
    public function update_yoast_data($request) {
        $post_id = (int) $request['id'];
        $post = get_post($post_id);

        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }

        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_body_params();
        }

        $updated_fields = array();

        // 1. Focus keyword
        if (isset($params['focus_keyword'])) {
            $kw = sanitize_text_field($params['focus_keyword']);
            update_post_meta($post_id, '_yoast_wpseo_focuskw', $kw);
            $updated_fields['focus_keyword'] = $kw;
        }

        // 2. SEO Title
        if (isset($params['seo_title'])) {
            $title = sanitize_text_field($params['seo_title']);
            update_post_meta($post_id, '_yoast_wpseo_title', $title);
            $updated_fields['seo_title'] = $title;
        }

        // 3. Meta Description
        if (isset($params['meta_description'])) {
            $desc = sanitize_textarea_field($params['meta_description']);
            update_post_meta($post_id, '_yoast_wpseo_metadesc', $desc);
            $updated_fields['meta_description'] = $desc;
        }

        // 4. Slug if provided
        if (!empty($params['slug'])) {
            $new_slug = sanitize_title($params['slug']);
            if ($new_slug !== $post->post_name) {
                wp_update_post(array(
                    'ID'        => $post_id,
                    'post_name' => $new_slug,
                ));
                $updated_fields['slug'] = $new_slug;
            }
        }

        // If Yoast Indexable repository is loaded, sync indexable
        if (class_exists('Yoast\\WP\\SEO\\Repositories\\Indexable_Repository')) {
            try {
                if (function_exists('YoastSEO')) {
                    $repository = YoastSEO()->classes->get('Yoast\\WP\\SEO\\Repositories\\Indexable_Repository');
                    if ($repository && method_exists($repository, 'find_by_id_and_type')) {
                        $indexable = $repository->find_by_id_and_type($post_id, 'post');
                        if ($indexable && method_exists($indexable, 'save')) {
                            if (isset($updated_fields['focus_keyword'])) $indexable->primary_focus_keyword = $updated_fields['focus_keyword'];
                            if (isset($updated_fields['seo_title'])) $indexable->title = $updated_fields['seo_title'];
                            if (isset($updated_fields['meta_description'])) $indexable->description = $updated_fields['meta_description'];
                            $indexable->save();
                        }
                    }
                }
            } catch (Exception $e) {
                // Non-fatal, meta keys are already updated
            }
        }

        return rest_ensure_response(array(
            'success'        => true,
            'post_id'        => $post_id,
            'updated_fields' => $updated_fields,
            'message'        => 'Yoast SEO metadata saved successfully.',
        ));
    }
}

new PressPulse_SEO_Companion();
`;

export const INSTALLATION_STEPS = [
  {
    step: 1,
    title: 'Download or copy the PHP file',
    instruction:
      'Copy the PHP code above into a file named "presspulse-seo-companion.php" on your computer or server.',
  },
  {
    step: 2,
    title: 'Upload to your WordPress site',
    instruction:
      'Place the file into your WordPress plugins directory: /wp-content/plugins/presspulse-seo-companion/presspulse-seo-companion.php (or zip the folder and upload via WP Admin → Plugins → Add New → Upload Plugin).',
  },
  {
    step: 3,
    title: 'Activate the plugin',
    instruction:
      'Go to WordPress Admin → Plugins → Installed Plugins, find "PressPulse SEO Companion", and click "Activate".',
  },
  {
    step: 4,
    title: 'Verify connection in PressPulse',
    instruction:
      'In the Settings tab in PressPulse, click "Test Connection". The app will detect the companion plugin and show "Yoast Companion Active: Yes".',
  },
];
