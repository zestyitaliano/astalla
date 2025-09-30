<?php
class Astalla_Control_Rest {
    private $settings;

    public function __construct($settings) {
        $this->settings = $settings;
    }

    public function register_routes() {
        add_action('rest_api_init', function () {
            register_rest_route('astalla/v1', '/promo', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_promo'],
                'permission_callback' => '__return_true',
            ]);
        });
    }

    public function handle_promo($request) {
        $params = $request->get_json_params();
        $settings = $this->settings->get_settings();

        if (!$this->verify_signature($params, $settings['shared_secret'])) {
            return new WP_Error('invalid_signature', 'Signature mismatch', ['status' => 401]);
        }

        $property_code = sanitize_text_field($params['property_code'] ?? '');
        $promo_text = wp_kses_post($params['promo_text'] ?? '');
        $hero_image_url = esc_url_raw($params['hero_image_url'] ?? '');

        if (empty($property_code)) {
            return new WP_Error('missing_property', 'property_code is required', ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => 'ast_promo',
            'post_title' => sprintf('Promo for %s', $property_code),
            'post_content' => $promo_text,
            'post_status' => 'publish',
            'meta_input' => [
                'property_code' => $property_code,
                'hero_image_url' => $hero_image_url,
            ],
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        if (!empty($hero_image_url)) {
            $this->maybe_attach_image($post_id, $hero_image_url);
        }

        delete_transient('astalla_promo_' . $property_code);

        return [
            'id' => $post_id,
            'status' => 'ok',
        ];
    }

    private function verify_signature($params, $secret) {
        if (empty($secret) || empty($params['sig'])) {
            return false;
        }
        $payload = wp_json_encode([
            'property_code' => $params['property_code'] ?? '',
            'promo_text' => $params['promo_text'] ?? '',
            'hero_image_url' => $params['hero_image_url'] ?? '',
        ]);
        $expected = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $params['sig']);
    }

    private function maybe_attach_image($post_id, $url) {
        $tmp = download_url($url);
        if (is_wp_error($tmp)) {
            return;
        }

        $file = [
            'name' => basename($url),
            'type' => mime_content_type($tmp),
            'tmp_name' => $tmp,
            'size' => filesize($tmp),
        ];

        $sideload = media_handle_sideload($file, $post_id);
        if (!is_wp_error($sideload)) {
            set_post_thumbnail($post_id, $sideload);
        }
    }
}
