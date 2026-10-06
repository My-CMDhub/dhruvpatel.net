// The mark beside each stack chip on the home page. Vector marks are the official Simple Icons files
// (CC0), saved under public/tech and tinted with the brand's own colour. Cartesia, Infura and
// Guardrails AI aren't in Simple Icons, so theirs came from their own sites on 6 Oct 2026.
//
// `ink`: the brand colour is near-black and would vanish on the dark theme, so there it takes the
// chip's text colour instead. `img`: a full-colour file, drawn as it is rather than tinted.
// A chip with no entry here simply shows its text.

export type Tech = { src: string; color?: string; ink?: boolean; img?: boolean }

const aws: Tech = { src: '/tech/amazonwebservices.svg', color: '#232F3E', ink: true }
const swift: Tech = { src: '/tech/swift.svg', color: '#F05138' }
const apple: Tech = { src: '/tech/apple.svg', color: '#000000', ink: true }
const python: Tech = { src: '/tech/python.svg', color: '#3776AB' }
const fastapi: Tech = { src: '/tech/fastapi.svg', color: '#009688' }

export const tech: Record<string, Tech> = {
  Python: python,
  FastAPI: fastapi,
  Twilio: { src: '/tech/twilio.svg', color: '#F22F46' },
  Deepgram: { src: '/tech/deepgram.svg', color: '#13EF93' },
  OpenAI: { src: '/tech/openai.svg', color: '#412991', ink: true },
  Cartesia: { src: '/tech/cartesia.svg', img: true },
  Appwrite: { src: '/tech/appwrite.svg', color: '#FD366E' },
  'Next.js': { src: '/tech/nextdotjs.svg', color: '#000000', ink: true },
  Gemini: { src: '/tech/googlegemini.svg', color: '#8E75B2' },
  Claude: { src: '/tech/claude.svg', color: '#D97757' },

  Swift: swift,
  SwiftUI: swift,
  'Swift Testing': swift,
  'macOS Accessibility': apple,
  Keychain: apple,
  macOS: apple,

  'Node.js': { src: '/tech/nodedotjs.svg', color: '#5FA04E' },
  TypeScript: { src: '/tech/typescript.svg', color: '#3178C6' },
  React: { src: '/tech/react.svg', color: '#61DAFB' },
  'Web3.js': { src: '/tech/web3dotjs.svg', color: '#F16822' },
  Ethereum: { src: '/tech/ethereum.svg', color: '#3C3C3D', ink: true },
  Infura: { src: '/tech/infura.svg' },

  'AWS STS': aws,
  'ECS Fargate': aws,
  CloudFormation: aws,
  AWS: aws,
  'Managed Agents': { src: '/tech/anthropic.svg', color: '#191919', ink: true },
  Anthropic: { src: '/tech/anthropic.svg', color: '#191919', ink: true },
  'Ruby on Rails': { src: '/tech/rubyonrails.svg', color: '#D30001' },

  Django: { src: '/tech/django.svg', color: '#092E20', ink: true },
  PostgreSQL: { src: '/tech/postgresql.svg', color: '#4169E1' },
  vLLM: { src: '/tech/vllm.svg' },
  'Qwen 2.5': { src: '/tech/qwen.svg' },
  'Guardrails AI': { src: '/tech/guardrails.png', img: true },
}
