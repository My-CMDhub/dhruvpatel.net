// Who is reading. A card arrives beside the cursor and lets a visitor say so; the choice is
// remembered and swaps a short paragraph at the top of each case page. No model runs at any point — every line
// below is written once, by hand, and shipped as data. `look` is the default, and has to be good enough
// that a visitor who never answers loses nothing.

export type PersonaId = 'look' | 'founder' | 'engineer' | 'pm' | 'recruiter'

export const DEFAULT: PersonaId = 'look'

export const personas: { id: PersonaId; pick: string; says: string }[] = [
  { id: 'look', pick: 'just having a look', says: 'Then start anywhere. Every number on this site links to the thing it came from.' },
  { id: 'founder', pick: 'a founder or CTO', says: 'Then start with Ovela. It answers a real phone line in about a second, and the page says what it still gets wrong.' },
  { id: 'engineer', pick: 'a software or AI engineer', says: 'Then Agent-OS is the one. The interesting bug isn’t the fast one.' },
  { id: 'pm', pick: 'a product manager', says: 'Then read the NOT YET line on each project first. That’s the honest half.' },
  { id: 'recruiter', pick: 'a recruiter', says: 'Python, Swift, FastAPI, vLLM, AWS. Two internships, three projects, every claim sourced.' },
]

export const pickOf = (id: PersonaId) => personas.find((p) => p.id === id)?.pick ?? personas[0].pick

/** One short paragraph per case page, per reader. A page that can't manage five real angles gets
 *  fewer: anything missing falls back to `look`, which is always written. */
export const forCase: Record<string, Partial<Record<PersonaId, string>>> = {
  ovela: {
    look: 'A phone number that a machine answers. The hard part isn’t the model. It’s the silence after you stop talking, and how much work I had to get out of the way to make that silence short.',
    founder: 'It answers a live phone number in about a second. The two things making it slow were the ones nobody puts in a demo: the first model call on a phone call is cold, and a lookup that can’t say who’s calling is a wasted round trip. Both are fixed here, and what still isn’t is at the bottom of the page in the same size type.',
    engineer: 'The first request goes out while the greeting is still playing, so the cold start hides inside audio the caller is already hearing. The agent asks who’s calling before it looks anything up — twelve of fifteen replayed calls had been spending a lookup to learn nothing. Answer times below are measured from the recording, so they include the recogniser’s end-of-turn pause; inside the agent they’re about half a second faster, and both numbers are on the page.',
    pm: 'What makes a caller trust a voice agent isn’t accuracy, it’s how long it waits before speaking. I got that from 3.7 s down to 0.9 s without making anything run faster: the slow part now happens while the greeting is still playing, so the caller never sits through it. The trade I took is that it still asks who’s calling before it can help, because guessing from the phone number was sometimes pulling up the wrong guest.',
    recruiter: 'Voice AI on a live phone line, built solo. Python, FastAPI, asyncio, Twilio, Deepgram Flux, OpenAI, Cartesia, Appwrite. First reply 3.7 s → 0.9 s, measured from two recordings you can play on this page. 1,922 tests.',
  },
  'agent-os': {
    look: 'A program that lets an AI press buttons on a Mac. The work isn’t teaching it what to press. It’s making sure the panel you’d use to stop it keeps working, and keeps saying no.',
    founder: 'A model that can operate a computer is only shippable if a person can interrupt it. Making it fast is what exposed the real problem: while the harness was busy, anything pressing buttons in its own approval panel simply timed out, and that accident was the only thing stopping a caller from deleting the rules meant to restrain it. Once it was fast, the accident was gone, so the real refusal shipped in the same commit.',
    engineer: 'Requests ran on the main thread, so one three-second action blocked everything behind it: 8,520 ms of stalls in a single planner run, and a ping sent behind that action took 2,864 ms. Off the main thread it’s 5 ms. Then the part I didn’t expect. The harness’s own approval panel had been safe only because it was too busy to answer; once it wasn’t, a caller could have pressed Remove on one of its own rules.',
    pm: 'The feature is “an AI can use your Mac”. The product question is “how do I stop it”. The one thing the AI can’t touch is the panel you’d use to stop it — and that guarantee used to be an accident of timing, which is a bad thing for a guarantee to be. It’s a rule now. No model drives the planner yet: the actions are hand-written, and the page says so.',
    recruiter: 'A macOS harness that lets an AI model operate the desktop. Swift, macOS Accessibility API, Swift Testing. 61 of 81 commits and 27 of 52 Swift files are mine; 217 unit tests; open source, forked from farzaa/clicky. A request queued behind a three-second action: 2,864 ms → 5 ms.',
  },
  capstone: {
    look: 'A checkout that takes Ethereum. A payment that arrives a fraction short is still short, and working out how short counts as short turned out to be the whole project.',
    founder: 'Built for a real client and it won the showcase, but the part worth your time is what I found afterwards. The amount check accepted anything within half a percent, and when it couldn’t read an amount at all it counted the payment as correct. It fails closed as of the next day, and the margin is now six decimal places. It still has no automated tests, which is the first thing I’d fix.',
    engineer: 'The original check was a 0.5% tolerance, so a payment 0.00025 ETH short on a 0.05 ETH order passed. It now requires agreement to six decimals, allows one unit of rounding and never more than 0.000002 ETH, and anything it can’t verify counts as wrong. The band drawn on this page comes from running the real rule, not from a number I typed in. It still compares floating-point numbers rather than integer wei.',
    pm: 'Two failure modes with opposite costs: refuse a good payment and you lose a customer; accept a short one and the merchant is out of pocket with no way back. I moved the default from “accept when unsure” to “refuse when unsure” — the more expensive choice for us, the safer one for them.',
    recruiter: 'An Ethereum payment gateway for a real client; overall winner at the IMPACT 2025 capstone showcase. Lead decision-maker and main implementer in a team of five, then three; 64 of 75 commits mine. Node.js, Web3.js, Infura, React/TypeScript, Sepolia testnet.',
  },
  silverpond: {
    look: 'An internship where most of the work happened before any code did. The job was to let a company’s customers connect their own cloud account to a product, safely, without an engineer on a call. The interesting decisions were nearly all about what not to ask a customer for.',
    founder: 'The easy way to let a customer connect their cloud account is to ask them for a key and store it. I didn’t want anyone holding permanent credentials, so the design uses short-lived, tightly scoped access instead, with a per-customer identifier so one customer’s setup can’t be mistaken for another’s. Setup stopped being something an engineer does per account and became something the customer completes once, on their own.',
    engineer: 'Four things I assumed turned out to be wrong, and each one changed the design: a managed agent emits a run of events rather than a token stream; an environment can’t be created by the same deployment that creates the role it depends on; a connected worker is not an authorised one; and memory stores belong to the agent, not to a chat session. All four are about how public services behave, and all four cost me a day.',
    pm: 'Two constraints pointed the same way: a customer shouldn’t have to hand over a permanent key, and they shouldn’t need an engineer on a call to get started. Both led to a setup the customer finishes themselves, with access that expires on its own. How the agent should decide which case you’re asking about was never settled — and saying so is more useful than pretending it was.',
    recruiter: 'Software Engineer (AI) intern. Designed and prototyped customer onboarding for a multi-tenant platform: temporary scoped cross-account access rather than stored credentials, self-service provisioning, and an end-to-end prototype that validated the design before production implementation. Python, FastAPI, AWS (STS, ECS Fargate, CloudFormation), Anthropic Managed Agents.',
  },
  audacix: {
    look: 'A security scanner with an assistant inside it. It answers questions about your own scan, and it’s meant to refuse when someone tries to use it for something else — which people try immediately.',
    founder: 'Same GPU, better model, and the guardrails got stricter rather than looser. Moving from Llama 3.1 8B at 4-bit to Qwen 2.5 7B at 8-bit was a decision about what fits in 16 GB alongside the context, not about a leaderboard. It’s still live in the product. The numbers I’d most want to show you were never recorded in a form I can publish, and I’d rather say that than estimate them.',
    engineer: 'Qwen 2.5 7B at 8-bit leaves more room for context than Llama 3.1 8B at 4-bit, because its KV cache is 56 KB per token against 128 KB — roughly 63k tokens of headroom versus 52k on the same card. The guardrails framework could only judge a finished answer, so I streamed the answer and checked it a few sentences at a time on CPU, cutting the stream the moment a piece failed. No extra GPU.',
    pm: 'An assistant that is checked only after it finishes speaking is an assistant that has already said the wrong thing. Checking as it streams means the sentence can stop mid-flow, which looks abrupt and is the right trade. Context comes from the user’s own scan records and a small fixed knowledge base — no vector database to run or keep in sync.',
    recruiter: 'The assistant inside a live security scanner, as a Full-Stack Developer intern. Django, PostgreSQL, AWS, vLLM, Qwen 2.5, Guardrails AI. Streamed output guardrails on CPU; no vector database. Still live in the Cyber Chief scanner.',
  },
}
