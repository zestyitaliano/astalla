<?php
/**
 * Plugin Name: Astalla Bridge
 * Description: Provides REST endpoints for synchronizing content with the Astalla service.
 * Version: 1.0.0
 * Author: Astalla
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Astalla_Bridge_Plugin {
    const OPTION_SECRET = 'astalla_bridge_secret';
    const REST_NAMESPACE = 'astalla/v1';

    public static function init(): void {
        add_action( 'rest_api_init', [ self::class, 'register_routes' ] );
        add_filter( 'rest_authentication_errors', [ self::class, 'authenticate_requests' ], 10, 2 );
        add_action( 'admin_menu', [ self::class, 'register_settings_page' ] );
        add_action( 'admin_post_astalla_bridge_save_secret', [ self::class, 'handle_save_secret' ] );
    }

    public static function get_secret(): string {
        $secret = get_option( self::OPTION_SECRET );
        return is_string( $secret ) ? $secret : '';
    }

    public static function register_routes(): void {
        register_rest_route(
            self::REST_NAMESPACE,
            '/health',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ self::class, 'handle_health' ],
                'permission_callback' => '__return_true',
            ]
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/content',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ self::class, 'handle_get_content' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'type'     => [ 'sanitize_callback' => 'sanitize_key' ],
                    'search'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                    'page'     => [ 'sanitize_callback' => 'absint' ],
                    'per_page' => [ 'sanitize_callback' => 'absint' ],
                ],
            ]
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/content',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ self::class, 'handle_post_content' ],
                'permission_callback' => '__return_true',
                'args'                => [
                    'id'      => [ 'sanitize_callback' => 'absint' ],
                    'type'    => [ 'required' => true, 'sanitize_callback' => 'sanitize_key' ],
                    'title'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                    'slug'    => [ 'sanitize_callback' => 'sanitize_title' ],
                    'status'  => [ 'sanitize_callback' => 'sanitize_key' ],
                    'content' => [],
                    'meta'    => [],
                ],
            ]
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/media',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ self::class, 'handle_post_media' ],
                'permission_callback' => '__return_true',
            ]
        );
    }

    public static function authenticate_requests( $result, $request ) {
        if ( ! $request instanceof WP_REST_Request ) {
            return $result;
        }

        $route = $request->get_route();
        if ( strpos( $route, '/' . self::REST_NAMESPACE ) !== 0 ) {
            return $result;
        }

        $secret = self::get_secret();
        if ( '' === $secret ) {
            return new WP_Error( 'astalla_bridge_secret_missing', __( 'Astalla secret is not configured.', 'astalla-bridge' ), [ 'status' => 401 ] );
        }

        $signature = $request->get_header( 'x-astalla-signature' );
        if ( ! is_string( $signature ) || '' === $signature ) {
            return new WP_Error( 'astalla_bridge_signature_missing', __( 'Missing Astalla signature.', 'astalla-bridge' ), [ 'status' => 401 ] );
        }

        $body = $request->get_body();
        if ( null === $body ) {
            $body = '';
        }

        if ( '' === $body && in_array( $request->get_method(), [ 'POST', 'PUT', 'PATCH' ], true ) ) {
            $raw = file_get_contents( 'php://input' );
            if ( is_string( $raw ) && '' !== $raw ) {
                $body = $raw;
            }
        }

        $expected = base64_encode( hash_hmac( 'sha256', $body, $secret, true ) );

        if ( ! hash_equals( $expected, $signature ) ) {
            return new WP_Error( 'astalla_bridge_signature_invalid', __( 'Invalid Astalla signature.', 'astalla-bridge' ), [ 'status' => 401 ] );
        }

        return $result;
    }

    public static function handle_health( WP_REST_Request $request ): WP_REST_Response {
        return new WP_REST_Response(
            [
                'ok'   => true,
                'site' => get_bloginfo( 'name' ),
            ]
        );
    }

    public static function handle_get_content( WP_REST_Request $request ) {
        $type     = $request->get_param( 'type' ) ? sanitize_key( $request->get_param( 'type' ) ) : 'post';
        $search   = $request->get_param( 'search' );
        $page     = max( 1, (int) $request->get_param( 'page' ) );
        $per_page = (int) $request->get_param( 'per_page' );

        if ( $per_page <= 0 ) {
            $per_page = 20;
        }

        $per_page = min( $per_page, 100 );

        $query_args = [
            'post_type'      => $type,
            's'              => $search,
            'paged'          => $page,
            'posts_per_page' => $per_page,
            'post_status'    => [ 'publish', 'draft', 'pending', 'future', 'private' ],
            'orderby'        => 'modified',
            'order'          => 'DESC',
            'fields'         => 'ids',
        ];

        $query = new WP_Query( $query_args );
        $posts = [];

        foreach ( $query->posts as $post_id ) {
            $post = get_post( $post_id );
            if ( ! $post ) {
                continue;
            }

            $posts[] = [
                'id'       => $post->ID,
                'title'    => get_the_title( $post ),
                'slug'     => $post->post_name,
                'status'   => $post->post_status,
                'modified' => get_post_modified_time( 'c', true, $post ),
            ];
        }

        return new WP_REST_Response( $posts );
    }

    public static function handle_post_content( WP_REST_Request $request ) {
        $data = $request->get_json_params();

        if ( ! is_array( $data ) ) {
            return new WP_Error( 'astalla_bridge_invalid_body', __( 'Invalid request body.', 'astalla-bridge' ), [ 'status' => 400 ] );
        }

        $type = isset( $data['type'] ) ? sanitize_key( $data['type'] ) : '';

        if ( '' === $type ) {
            return new WP_Error( 'astalla_bridge_missing_type', __( 'The "type" field is required.', 'astalla-bridge' ), [ 'status' => 400 ] );
        }

        $postarr = [
            'post_type' => $type,
        ];

        if ( ! empty( $data['id'] ) ) {
            $postarr['ID'] = (int) $data['id'];
        }

        if ( isset( $data['title'] ) ) {
            $postarr['post_title'] = sanitize_text_field( $data['title'] );
        }

        if ( isset( $data['slug'] ) ) {
            $postarr['post_name'] = sanitize_title( $data['slug'] );
        }

        if ( isset( $data['status'] ) ) {
            $postarr['post_status'] = sanitize_key( $data['status'] );
        }

        if ( isset( $data['content'] ) ) {
            $postarr['post_content'] = wp_kses_post( $data['content'] );
        }

        if ( isset( $data['meta'] ) && ! is_array( $data['meta'] ) ) {
            return new WP_Error( 'astalla_bridge_invalid_meta', __( 'Meta must be an associative array.', 'astalla-bridge' ), [ 'status' => 400 ] );
        }

        if ( isset( $postarr['ID'] ) ) {
            $post_id = wp_update_post( $postarr, true );
        } else {
            $post_id = wp_insert_post( $postarr, true );
        }

        if ( is_wp_error( $post_id ) ) {
            return $post_id;
        }

        if ( isset( $data['meta'] ) && is_array( $data['meta'] ) ) {
            foreach ( $data['meta'] as $meta_key => $meta_value ) {
                $meta_key = sanitize_key( $meta_key );
                update_post_meta( $post_id, $meta_key, wp_unslash( $meta_value ) );
            }
        }

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error( 'astalla_bridge_post_missing', __( 'Unable to load the post.', 'astalla-bridge' ), [ 'status' => 500 ] );
        }

        $response = [
            'id'       => $post->ID,
            'title'    => get_the_title( $post ),
            'slug'     => $post->post_name,
            'status'   => $post->post_status,
            'modified' => get_post_modified_time( 'c', true, $post ),
        ];

        if ( isset( $data['meta'] ) ) {
            $response['meta'] = [];
            foreach ( $data['meta'] as $meta_key => $_ ) {
                $meta_key                   = sanitize_key( $meta_key );
                $response['meta'][ $meta_key ] = get_post_meta( $post_id, $meta_key, true );
            }
        }

        return new WP_REST_Response( $response );
    }

    public static function handle_post_media( WP_REST_Request $request ) {
        $files = $request->get_file_params();

        if ( empty( $files ) ) {
            return new WP_Error( 'astalla_bridge_missing_file', __( 'No file uploaded.', 'astalla-bridge' ), [ 'status' => 400 ] );
        }

        $file = reset( $files );

        if ( ! isset( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
            return new WP_Error( 'astalla_bridge_invalid_upload', __( 'Invalid uploaded file.', 'astalla-bridge' ), [ 'status' => 400 ] );
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $file_array = [
            'name'     => sanitize_file_name( $file['name'] ?? 'upload' ),
            'type'     => $file['type'] ?? '',
            'tmp_name' => $file['tmp_name'],
            'error'    => $file['error'] ?? 0,
            'size'     => $file['size'] ?? 0,
        ];

        $attachment_id = media_handle_sideload( $file_array, 0 );

        if ( is_wp_error( $attachment_id ) ) {
            return $attachment_id;
        }

        $url  = wp_get_attachment_url( $attachment_id );
        $mime = get_post_mime_type( $attachment_id );

        return new WP_REST_Response(
            [
                'id'   => $attachment_id,
                'url'  => $url,
                'mime' => $mime,
            ]
        );
    }

    public static function register_settings_page(): void {
        add_options_page(
            __( 'Astalla Bridge', 'astalla-bridge' ),
            __( 'Astalla Bridge', 'astalla-bridge' ),
            'manage_options',
            'astalla-bridge',
            [ self::class, 'render_settings_page' ]
        );
    }

    public static function render_settings_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $secret = esc_attr( self::get_secret() );
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Astalla Bridge', 'astalla-bridge' ); ?></h1>
            <?php if ( isset( $_GET['updated'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
                <div id="message" class="updated notice is-dismissible"><p><?php esc_html_e( 'Settings saved.', 'astalla-bridge' ); ?></p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <?php wp_nonce_field( 'astalla_bridge_save_secret' ); ?>
                <input type="hidden" name="action" value="astalla_bridge_save_secret" />
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="astalla-bridge-secret"><?php esc_html_e( 'ASTALLA_SECRET', 'astalla-bridge' ); ?></label></th>
                        <td>
                            <input type="text" id="astalla-bridge-secret" name="astalla_bridge_secret" class="regular-text" value="<?php echo $secret; ?>" autocomplete="off" />
                            <p class="description"><?php esc_html_e( 'This secret is used to verify requests from the Astalla API.', 'astalla-bridge' ); ?></p>
                        </td>
                    </tr>
                </table>
                <?php submit_button( __( 'Save Secret', 'astalla-bridge' ) ); ?>
                <button type="button" class="button" id="astalla-bridge-rotate"><?php esc_html_e( 'Rotate Secret', 'astalla-bridge' ); ?></button>
            </form>
        </div>
        <script>
            (function() {
                function generateSecret(length) {
                    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    var result = '';
                    if (window.crypto && window.crypto.getRandomValues) {
                        var values = new Uint32Array(length);
                        window.crypto.getRandomValues(values);
                        for (var i = 0; i < length; i++) {
                            result += charset[values[i] % charset.length];
                        }
                        return result;
                    }
                    for (var j = 0; j < length; j++) {
                        result += charset.charAt(Math.floor(Math.random() * charset.length));
                    }
                    return result;
                }
                var rotateButton = document.getElementById('astalla-bridge-rotate');
                if (rotateButton) {
                    rotateButton.addEventListener('click', function() {
                        var field = document.getElementById('astalla-bridge-secret');
                        if (field) {
                            field.value = generateSecret(48);
                        }
                    });
                }
            })();
        </script>
        <?php
    }

    public static function handle_save_secret(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to manage this setting.', 'astalla-bridge' ) );
        }

        check_admin_referer( 'astalla_bridge_save_secret' );

        $secret = isset( $_POST['astalla_bridge_secret'] ) ? sanitize_text_field( wp_unslash( $_POST['astalla_bridge_secret'] ) ) : '';
        update_option( self::OPTION_SECRET, $secret );

        wp_safe_redirect( add_query_arg( 'updated', 'true', admin_url( 'options-general.php?page=astalla-bridge' ) ) );
        exit;
    }
}

Astalla_Bridge_Plugin::init();
