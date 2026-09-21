# UTM Guide — tagging links so we know where signups come from

Every link we send people to Instant Catalog carries a few tags (UTM parameters) on the end of the URL. When someone signs up, the tags from **their first tagged visit** are saved on their account and show up in the admin panel (Vendors → Source column, filter, vendor detail page, Excel export).

Untagged links still work — they just can't be told apart, and land in **Direct**.

## Rules (please follow exactly)

1. **All lowercase.** `meta`, not `Meta`. (The system lowercases anyway, but keep source links clean.)
2. **Underscores, no spaces.** `cold_outreach_sep26`, not `Cold Outreach Sep 26`.
3. **Use only the `utm_source` / `utm_medium` values in the table below.** A new value shows up as **Other**.
4. **Campaign name = `<goal>_<audience>_<monthyy>`**, e.g. `cold_outreach_sep26`. One name per send/campaign — never reuse one for something different.
5. **Never put personal data in a link** (names, emails, phone numbers).
6. **Tag the link, not the page.** The tags work on any page — homepage, `/catalog-preview`, `/signup`.

## The four channels

| Channel (admin) | `utm_source` | `utm_medium` | `utm_campaign` | `utm_content` |
|---|---|---|---|---|
| **Email** (Smartlead) | `smartlead` | `email` | campaign name | sequence step: `step1`, `step2`, … |
| **Meta Ads** | `meta` | `paid_social` | campaign name | ad name |
| **Catalog Footer** | `catalog` | `footer` | `free_cta` / `powered_by` | — |
| **Direct** | *(no tags)* | | | |

## Ready-to-use URLs

Replace the campaign name with your own. Swap `https://instantcatalog.app/` for `https://instantcatalog.app/catalog-preview` (or `/signup`) to land people on a different page.

### Email — Smartlead

Template:

```
https://instantcatalog.app/?utm_source=smartlead&utm_medium=email&utm_campaign=<campaign_name>&utm_content=<step>
```

Example — a 3-step cold outreach sequence, one link per step:

```
https://instantcatalog.app/?utm_source=smartlead&utm_medium=email&utm_campaign=cold_outreach_sep26&utm_content=step1
https://instantcatalog.app/?utm_source=smartlead&utm_medium=email&utm_campaign=cold_outreach_sep26&utm_content=step2
https://instantcatalog.app/?utm_source=smartlead&utm_medium=email&utm_campaign=cold_outreach_sep26&utm_content=step3
```

Landing on the free catalog preview instead:

```
https://instantcatalog.app/catalog-preview?utm_source=smartlead&utm_medium=email&utm_campaign=cold_outreach_sep26&utm_content=step1
```

Keep Smartlead's link tracking on if you like — it redirects to the URL above. **Send yourself a test first** (see checklist).

### Meta Ads

In Ads Manager, paste this into the ad's **URL parameters** field (Ad → Tracking → URL parameters). Do *not* add the `?` and do not paste it onto the website URL. Meta fills in the `{{…}}` values itself.

```
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Website URL for the ad: `https://instantcatalog.app/` (or `/catalog-preview`).

Name your Meta campaigns and ads in lowercase with underscores (e.g. `signup_india_sep26`) — that's exactly what will appear in the admin panel.

### Catalog Footer — already built in

No action needed. The footer of every public catalog links to:

```
https://instantcatalog.app/?utm_source=catalog&utm_medium=footer&utm_campaign=free_cta      (free-plan vendors: "Try Instant Catalog Free")
https://instantcatalog.app/?utm_source=catalog&utm_medium=footer&utm_campaign=powered_by    (paid vendors: "Powered by Instant Catalog")
```

### Direct

Nothing to build. A signup with no tags and no referring website is **Direct** (typed the address, bookmark, link pasted into a chat). A signup with no tags but a referring website (e.g. from Google) is **Other**.

## Before you launch any campaign — 2-minute test

1. Open the tagged URL in a **private/incognito window**.
2. Sign up with a test email and finish verification.
3. Admin → Vendors → open that vendor → **Signup Source** should show the right channel and campaign.

If it says Direct, something between the click and the site removed the tags (a link shortener, a redirect, or the tags were typed wrong) — fix the link before sending.

## How the numbers behave

- **First touch only.** The first tagged link a person clicks gets the credit; later clicks don't change it. It's remembered in their browser for 90 days.
- **Signup is what's recorded**, not verification — an unverified vendor still has a source. Filter by status if you want verified-only.
- **Vendors registered before this shipped** show as *Unknown (before tracking)*. They can't be backfilled.
- **Gaps you can't fix:** someone who clicks an ad on their phone and signs up later on a laptop, or with cookies/storage cleared, shows as Direct.
