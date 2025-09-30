<?php
/**
 * Plugin Name: Astalla Control Proxy
 * Description: Receives promo payloads from Astalla Control and updates WordPress content.
 * Version: 0.1.0
 * Author: Astalla
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ASTALLA_CONTROL_OPTION_KEY', 'astalla_control_settings');

defaults();
function defaults() {
    if (!get_option(ASTALLA_CONTROL_OPTION_KEY)) {
        update_option(ASTALLA_CONTROL_OPTION_KEY, [
            'property_code' => '',
            'api_secret' => ''
        ]);
    }
}

add_action('init', function () {
    register_post_type('ast_property', [
        'label' => 'Astalla Properties',
        'public' => false,
        'show_ui' => true,
        'supports' => ['title', 'editor', 'thumbnail']
    ]);

    register_post_type('ast_promo', [
        'label' => 'Astalla Promos',
        'public' => false,
        'show_ui' => true,
        'supports' => ['title', 'editor', 'thumbnail']
    ]);
});

add_action('admin_menu', function () {
    add_options_page('Astalla Control', 'Astalla Control', 'manage_options', 'astalla-control', 'astalla_control_settings_page');
});

function astalla_control_settings_page()
{
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['astalla_control_submit'])) {
        check_admin_referer('astalla_control_settings');
        update_option(ASTALLA_CONTROL_OPTION_KEY, [
            'property_code' => sanitize_text_field($_POST['property_code'] ?? ''),
            'api_secret' => sanitize_text_field($_POST['api_secret'] ?? '')
        ]);
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }

    $settings = get_option(ASTALLA_CONTROL_OPTION_KEY);
    ?>
    <div class="wrap">
        <h1>Astalla Control</h1>
        <form method="post">
            <?php wp_nonce_field('astalla_control_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="property_code">Property Code</label></th>
                    <td><input name="property_code" type="text" value="<?php echo esc_attr($settings['property_code'] ?? ''); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="api_secret">API Secret</label></th>
                    <td><input name="api_secret" type="text" value="<?php echo esc_attr($settings['api_secret'] ?? ''); ?>" class="regular-text"></td>
                </tr>
            </table>
            <p class="submit"><input type="submit" name="astalla_control_submit" class="button-primary" value="Save Changes"></p>
        </form>
    </div>
    <?php
}

add_action('rest_api_init', function () {
    register_rest_route('astalla/v1', '/promo', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'astalla_control_handle_promo'
    ]);
});

function astalla_control_handle_promo(WP_REST_Request $request)
{
    $settings = get_option(ASTALLA_CONTROL_OPTION_KEY, []);
    $payload = $request->get_json_params();
    $property_code = $payload['property_code'] ?? '';
    $promo_text = $payload['promo_text'] ?? '';
    $hero_image_url = $payload['hero_image_url'] ?? '';
    $signature = $payload['sig'] ?? '';

    if (empty($settings['api_secret'])) {
        return new WP_Error('no_secret', 'API secret not configured', ['status' => 403]);
    }

    $expected = hash_hmac('sha256', $property_code . '|' . $promo_text, $settings['api_secret']);
    if (!hash_equals($expected, $signature)) {
        return new WP_Error('invalid_signature', 'Signature mismatch', ['status' => 403]);
    }

    if (!empty($settings['property_code']) && $settings['property_code'] !== $property_code) {
        return new WP_Error('property_mismatch', 'Property code mismatch', ['status' => 403]);
    }

    $post_id = wp_insert_post([
        'post_type' => 'ast_promo',
        'post_title' => $property_code . ' Promo',
        'post_status' => 'publish',
        'post_content' => wp_kses_post($promo_text)
    ], true);

    if (is_wp_error($post_id)) {
        return $post_id;
    }

    if (!empty($hero_image_url)) {
        astalla_control_attach_image($post_id, $hero_image_url);
    }

    delete_transient('astalla_promo_' . $property_code);

    return [
        'status' => 'ok',
        'post_id' => $post_id
    ];
}

function astalla_control_attach_image($post_id, $image_url)
{
    $tmp = download_url($image_url);
    if (is_wp_error($tmp)) {
        return;
    }

    $file = [
        'name' => basename($image_url),
        'type' => mime_content_type($tmp),
        'tmp_name' => $tmp,
        'size' => filesize($tmp),
        'error' => 0
    ];

    $id = media_handle_sideload($file, $post_id);
    if (is_wp_error($id)) {
        @unlink($tmp);
        return;
    }

    set_post_thumbnail($post_id, $id);
}
