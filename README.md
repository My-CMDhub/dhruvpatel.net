# dhruvpatel.net

My engineering portfolio. Every figure on it comes from a measurement or the git history, and each one says which.

The interactive pieces re-run real logic rather than animating a story:

- **Pay the invoice** (`components/InvoiceDemo.tsx`): the capstone's payment-amount check, both the 14 April and 10 May versions, ported from the git history (`data/amountRules.ts`).
- **Try to approve it** (`components/ApprovalDemo.tsx`): Agent-OS's approval rules, with the keyword lists and messages copied from the Swift source (`data/approvalRules.ts`).
- **Silverpond walkthrough** (`components/SilverpondFlow.tsx`): the agent architecture from my internship, as a steppable diagram.

`npm run check` runs the assertions for both ported rule sets.

## Run it

Node 20+ (`.nvmrc` pins 22).

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # rule assertions
npm run build    # static export to out/
```

## Where things live

| Path | What |
| --- | --- |
| `data/figures.ts` | Every figure shown in more than one place: home scenes, ledgers, labels. Change a number once here. |
| `app/work/<project>/page.mdx` | The case pages. A figure used only once sits next to its sentence. |
| `components/` | Ruler, scene, labels, media and the three demos. |
| `public/media/` | Videos and posters. `out/` is rebuilt on every build, so media goes here, never in `out/`. |
| `cloudfront-index.js` | CloudFront Function: `www` → apex, and `/work/x/` → `/work/x/index.html`. |

## Stack

Next.js 15 (App Router, `output: 'export'`), MDX, IBM Plex, plain CSS. No UI library, no analytics, no client-side data fetching.

Hosted on AWS: a private S3 bucket behind CloudFront (Origin Access Control), ACM certificate, Route 53 DNS.

## Deploy

Pushing to `main` deploys: `.github/workflows/site.yml` checks, builds, syncs `out/` to S3 and invalidates CloudFront, signed in through a GitHub OIDC role that can only touch this site. A 06:00 (Melbourne) run redeploys daily.

HTML and the `.txt` page payloads revalidate on every visit; everything else is content-hashed and cached for a year. A replaced file in `public/media/` needs a new name.

## NOT YET lines for live projects

Ovela's and Agent-OS's NOT YET line comes from their own README, between `<!-- not-yet -->` and `<!-- /not-yet -->`, fetched at build time (`scripts/not-yet.ts`). Plain text, 3–60 characters; anything else keeps the line in `data/figures.ts`. The GitHub profile's cards read the same marker.
