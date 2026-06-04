<?php
/**
 * Plugin Name: Abirlink ERP Embed
 * Description: Embeds the Abirlink ERP application into your WordPress site using a simple shortcode.
 * Version: 1.0.0
 * Author: Abirlink CommunicationBD
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Register the shortcode [abirlink_erp]
 */
function abirlink_erp_shortcode( $atts ) {
	// Default attributes
	$atts = shortcode_atts(
		array(
			'url'    => 'https://ais-dev-uhrsfg7n3igavq7tffl4kr-674719395631.asia-southeast1.run.app',
			'height' => '800px',
			'width'  => '100%',
		),
		$atts,
		'abirlink_erp'
	);

	// Sanitize URL
	$url = esc_url( $atts['url'] );
	$height = esc_attr( $atts['height'] );
	$width = esc_attr( $atts['width'] );

	// Output the iframe
	$output = '<div class="abirlink-erp-container" style="width: ' . $width . '; height: ' . $height . '; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.1);">';
	$output .= '<iframe src="' . $url . '" style="width: 100%; height: 100%; border: none;" allow="camera; microphone; geolocation" allowfullscreen></iframe>';
	$output .= '</div>';

	return $output;
}
add_shortcode( 'abirlink_erp', 'abirlink_erp_shortcode' );

/**
 * Add a settings page (optional but helpful)
 */
function abirlink_erp_menu() {
	add_options_page(
		'Abirlink ERP Settings',
		'Abirlink ERP',
		'manage_options',
		'abirlink-erp-settings',
		'abirlink_erp_settings_page'
	);
}
add_action( 'admin_menu', 'abirlink_erp_menu' );

function abirlink_erp_settings_page() {
	?>
	<div class="wrap">
		<h1>Abirlink ERP Integration</h1>
		<p>To embed the ERP on any page or post, use the following shortcode:</p>
		<code>[abirlink_erp]</code>
		<p>You can also customize the height:</p>
		<code>[abirlink_erp height="1000px"]</code>
		<hr>
		<h2>Current Application URL</h2>
		<p><code>https://ais-dev-uhrsfg7n3igavq7tffl4kr-674719395631.asia-southeast1.run.app</code></p>
	</div>
	<?php
}
