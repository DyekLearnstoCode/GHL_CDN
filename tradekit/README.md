# TradeKit

Shared CSS for GoHighLevel trade-business websites (`tk-` prefix). One file, versioned by git tag.

## Use on a site

1. GHL: Settings > Tracking & scripts > Head tracking code. Add the stylesheet link, then the client's colour overrides **after** it:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/DyekLearnstoCode/GHL_CDN@tradekit-v0.1.2/tradekit/tradekit.min.css">
<style>
:root {
    --tk-accent: #______;
    --tk-accent-hover: #______;
    --tk-accent-deep: #______;
    --tk-accent-on-dark: #______;
    --tk-accent-ink: #______;
    --tk-accent-text: #______;
    --tk-on-accent: #FFFFFF;
}
</style>
```

2. The defaults in `tradekit.css` are neutral slate. If a site looks slate, the overrides are missing.
3. On light backgrounds `--tk-accent-text` defaults to the accent. If the accent is too light for small text, set it to the `-ink` colour. Dark sections switch to `--tk-accent-on-dark` automatically.
4. Check contrast: white on accent and on hover at least 4.5, accent text on warm white at least 4.5.

## Versions

Always pin a tag in the URL (`@tradekit-v0.1.2`). `@main` is cached for up to 12 hours and will change under live sites. To update a site, change the tag in its head link. See `CHANGELOG.md`.

## Rules

- Never put client names, phone numbers, addresses or client colours in this file.
- Do not find-and-replace a brand name inside code identifiers.
