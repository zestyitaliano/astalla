=== Astalla Control Proxy ===
Contributors: astalla
Tags: api, promotions, real estate
Requires at least: 5.9
Tested up to: 6.4
Stable tag: 0.1.0
License: MIT

A lightweight proxy plugin that allows Astalla Control to push promotional content into WordPress.

== Description ==
* Registers custom post types for properties and promos.
* Provides an admin settings page to configure the property code and API secret.
* Exposes a REST endpoint (`/wp-json/astalla/v1/promo`) secured with an HMAC signature.

== Installation ==
1. Upload the `astalla-control` folder to `/wp-content/plugins/`.
2. Activate the plugin in WordPress admin.
3. Navigate to *Settings → Astalla Control* and configure the property code and API secret.
4. Provide the same secret to the Astalla Control backend.

== Changelog ==
= 0.1.0 =
* Initial release.
