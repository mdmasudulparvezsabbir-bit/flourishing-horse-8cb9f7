<?php
/**
 * Plugin Name: Abirlink ERP
 * Description: Premium financial management system for Abirlink CommunicationBD.
 * Version: 1.0.0
 * Author: Abirlink
 */

if (!defined('ABSPATH')) {
    exit;
}

class Abirlink_ERP {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        register_activation_hook(__FILE__, array($this, 'create_tables'));
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $table_users = $wpdb->prefix . 'abirlink_users';
        $table_income = $wpdb->prefix . 'abirlink_income';
        $table_expenses = $wpdb->prefix . 'abirlink_expenses';
        $table_notifications = $wpdb->prefix . 'abirlink_notifications';
        $table_settings = $wpdb->prefix . 'abirlink_settings';

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Users Table (Extending or separate)
        $sql_users = "CREATE TABLE $table_users (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            username varchar(100) NOT NULL,
            password varchar(255) NOT NULL,
            role varchar(50) DEFAULT 'User',
            name varchar(255) NOT NULL,
            photo varchar(255) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY username (username)
        ) $charset_collate;";
        dbDelta($sql_users);

        // Income Table
        $sql_income = "CREATE TABLE $table_income (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id mediumint(9) NOT NULL,
            amount decimal(15,2) NOT NULL,
            source varchar(255) NOT NULL,
            description text,
            date datetime DEFAULT CURRENT_TIMESTAMP,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_income);

        // Expenses Table
        $sql_expenses = "CREATE TABLE $table_expenses (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id mediumint(9) NOT NULL,
            amount decimal(15,2) NOT NULL,
            source varchar(255) NOT NULL,
            description text,
            date datetime DEFAULT CURRENT_TIMESTAMP,
            status varchar(50) DEFAULT 'Pending',
            manager_note text,
            deducted_amount decimal(15,2) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_expenses);

        // Notifications Table
        $sql_notifications = "CREATE TABLE $table_notifications (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id mediumint(9) NOT NULL,
            title varchar(255) NOT NULL,
            message text NOT NULL,
            type varchar(50) DEFAULT 'info',
            date datetime DEFAULT CURRENT_TIMESTAMP,
            is_read tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_notifications);

        // Settings Table
        $sql_settings = "CREATE TABLE $table_settings (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            company_name varchar(255) DEFAULT 'Abirlink ERP',
            logo varchar(255) DEFAULT NULL,
            balances text,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_settings);

        // Insert default settings if not exists
        if ($wpdb->get_var("SELECT COUNT(*) FROM $table_settings") == 0) {
            $wpdb->insert($table_settings, array(
                'company_name' => 'Abirlink ERP',
                'balances' => json_encode(array('cash' => 0, 'bkash' => 0, 'nagad' => 0, 'dbbl' => 0))
            ));
        }

        // Insert default admin if not exists
        if ($wpdb->get_var("SELECT COUNT(*) FROM $table_users") == 0) {
            $wpdb->insert($table_users, array(
                'username' => 'admin',
                'password' => password_hash('admin123', PASSWORD_DEFAULT),
                'role' => 'Admin',
                'name' => 'System Admin'
            ));
        }
    }

    public function register_routes() {
        register_rest_route('abirlink/v1', '/auth/login', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_login'),
            'permission_callback' => '__return_true'
        ));
        // Add more routes as needed...
    }

    public function handle_login($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $username = $params['username'];
        $password = $params['password'];

        $table_users = $wpdb->prefix . 'abirlink_users';
        $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_users WHERE username = %s", $username));

        if ($user && password_verify($password, $user->password)) {
            // In a real WP plugin, you might use JWT or WP cookies
            return new WP_REST_Response(array(
                'token' => 'wp-simulated-token',
                'user' => array(
                    'id' => $user->id,
                    'username' => $user->username,
                    'role' => $user->role,
                    'name' => $user->name,
                    'photo' => $user->photo
                )
            ), 200);
        }

        return new WP_Error('login_failed', 'Invalid credentials', array('status' => 401));
    }
}

Abirlink_ERP::get_instance();
