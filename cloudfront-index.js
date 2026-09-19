// CloudFront Function (viewer request). Two jobs:
// 1. www.dhruvpatel.net → dhruvpatel.net, one permanent address.
// 2. S3 behind CloudFront doesn't map /work/ovela/ to /work/ovela/index.html on its own, so this does.
// Paste into CloudFront → Functions (runtime cloudfront-js-2.0), publish, attach as "Viewer request".
function handler(event) {
  var r = event.request
  var host = r.headers.host && r.headers.host.value
  if (host && host.indexOf('www.') === 0)
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: 'https://' + host.slice(4) + r.uri } } }
  if (r.uri.endsWith('/')) r.uri += 'index.html'
  else if (!r.uri.split('/').pop().includes('.')) r.uri += '/index.html'
  return r
}
