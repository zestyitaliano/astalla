=== Astalla Control Connector ===
Contributors: astalla
Tags: integration, marketing, promos
Requires at least: 6.1
Tested up to: 6.5
Stable tag: 0.1.0
License: MIT

A lightweight connector that lets Astalla Control push property promos into WordPress via a secure REST endpoint.

== Description ==

* Registers custom post types for Astalla-managed properties and promos.
* Adds an admin settings page to store property code, API key, and shared secret.
* Exposes `/wp-json/astalla/v1/promo` to receive promo payloads and attach hero images.

== Installation ==

1. Download the plugin folder, zip it, and upload via *Plugins → Add New → Upload*.
2. Activate the plugin.
3. Navigate to *Settings → Astalla Control* to configure your property code, API key, and shared secret.
4. Provide the shared secret to the Astalla Control backend so it can sign promo payloads.

== Endpoint ==

`POST /wp-json/astalla/v1/promo`

```
{
  "property_code": "AST-HQ",
  "promo_text": "Move-in special",
  "hero_image_url": "https://example.com/promo.jpg",
  "sig": "hmac sha256"
}
```

== Changelog ==

= 0.1.0 =
* Initial release.
