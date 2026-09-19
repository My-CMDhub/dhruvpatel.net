import createMDX from '@next/mdx'

/** Static HTML in out/ — hosted on S3 + CloudFront. trailingSlash gives /work/ovela/index.html. */
export default createMDX()({
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: ['ts', 'tsx', 'mdx'],
})
