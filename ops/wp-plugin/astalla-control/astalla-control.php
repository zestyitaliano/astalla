<?php
/**
 * Plugin Name: Astalla Control Connector
 * Description: Receives promo updates from Astalla Control and syncs them into WordPress.
 * Version: 0.1.0
 * Author: Astalla
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-astalla-control-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-astalla-control-rest.php';

function astalla_control_activate() {
    astalla_control_register_cpts();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'astalla_control_activate');

function astalla_control_register_cpts() {
    register_post_type('ast_property', [
        'labels' => [
            'name' => __('Astalla Properties', 'astalla-control'),
        ],
        'public' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
    ]);

    register_post_type('ast_promo', [
        'labels' => [
            'name' => __('Astalla Promos', 'astalla-control'),
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
    ]);
}
add_action('init', 'astalla_control_register_cpts');

function astalla_control_bootstrap() {
    $settings = new Astalla_Control_Settings();
    $rest = new Astalla_Control_Rest($settings);
    $rest->register_routes();
}
add_action('plugins_loaded', 'astalla_control_bootstrap');
