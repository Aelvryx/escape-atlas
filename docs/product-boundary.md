# Escape Atlas product boundary

Escape Atlas is Anthony and Trenna's static public escape-room archive. The
Cloudflare Pages site owns the things a static site is good at:

- canonical room history;
- public room, venue, location and profile pages;
- trip planning and shareable routes;
- browser-only CSV validation and normalization; and
- social previews and profile sharing.

It is deliberately non-commercial. There are no paid tiers, subscriptions,
checkout flows, account promises or dormant billing entitlements in this
repository.

If the idea becomes a multi-user product, that product starts as a separate
application. Its architecture, identity model, storage, operations and offer
should be designed for the evolved product rather than treating this static
archive as a SaaS starter kit. Git history preserves the earlier prototype work
as research without leaving half-connected account infrastructure in production.
