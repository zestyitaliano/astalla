<?php
class Astalla_Control_Settings {
    const OPTION_KEY = 'astalla_control_settings';

    public function get_settings() {
        $defaults = [
            'property_code' => '',
            'api_key' => '',
            'shared_secret' => '',
        ];
        return wp_parse_args(get_option(self::OPTION_KEY, []), $defaults);
    }

    public function render_settings_page() {
        $options = $this->get_settings();
        ?>
        <div class="wrap">
            <h1>Astalla Control</h1>
            <form method="post" action="options.php">
                <?php settings_fields('astalla_control'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Property Code</th>
                        <td><input name="<?php echo esc_attr(self::OPTION_KEY); ?>[property_code]" type="text" value="<?php echo esc_attr($options['property_code']); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th scope="row">API Key</th>
                        <td><input name="<?php echo esc_attr(self::OPTION_KEY); ?>[api_key]" type="text" value="<?php echo esc_attr($options['api_key']); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th scope="row">Shared Secret</th>
                        <td><input name="<?php echo esc_attr(self::OPTION_KEY); ?>[shared_secret]" type="password" value="<?php echo esc_attr($options['shared_secret']); ?>" class="regular-text"></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

function astalla_control_register_settings() {
    register_setting('astalla_control', Astalla_Control_Settings::OPTION_KEY);
    add_options_page('Astalla Control', 'Astalla Control', 'manage_options', 'astalla-control', 'astalla_control_render_page');
}
add_action('admin_menu', 'astalla_control_register_settings');

function astalla_control_render_page() {
    $settings = new Astalla_Control_Settings();
    $settings->render_settings_page();
}
