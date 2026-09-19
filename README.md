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

```bash
npm run build
aws s3 sync out/ s3://BUCKET --delete --exclude "*.html" --exclude "*.txt" --cache-control "public,max-age=31536000,immutable"
aws s3 sync out/ s3://BUCKET --delete --exclude "*" --include "*.html" --include "*.txt" --cache-control "public,max-age=0,must-revalidate"
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

HTML and the `.txt` page payloads revalidate on every visit; everything else is content-hashed and cached for a year.
