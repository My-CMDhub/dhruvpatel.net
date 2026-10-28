// CloudFront Function (viewer request).
// Runtime: cloudfront-js-2.0
//
// Responsibilities:
// 1. Canonical Domain Enforcement & Open Redirect Prevention (CWE-601):
//    - Strictly enforce canonical host 'dhruvpatel.net'.
//    - Redirect 'www.dhruvpatel.net' -> 'https://dhruvpatel.net' (HTTP 301).
//    - Reject or block any unexpected/attacker-controlled Host headers (prevents Host Header Injection).
// 2. Query String Preservation (Analytics & UTM Tracking):
//    - CloudFront Functions isolate query string in r.querystring.
//    - Rebuild query string and preserve across all 301 redirects so tracking parameters are never lost.
// 3. Trailing Slash Directory Normalization (RFC 3986):
//    - Issue HTTP 301 redirect for directory paths missing a trailing slash (e.g. /work/ovela -> /work/ovela/).
//    - Prevents broken relative asset paths (<img src="preview.png">, stylesheets, scripts) in browsers.
// 4. Default Document Mapping for S3 Origin:
//    - For directory paths ending with '/', internally rewrite to 'index.html' before sending to S3.

function handler(event) {
  var r = event.request;
  var hostHeader = (r.headers.host && r.headers.host.value) || '';
  // Normalize host: strip port if present (e.g. "dhruvpatel.net:443")
  var host = hostHeader.split(':')[0].toLowerCase();
  var canonicalHost = 'dhruvpatel.net';

  // 1. Reconstruct query string if present (CloudFront Function v2 stores this in r.querystring)
  var qs = '';
  if (r.querystring) {
    if (typeof r.querystring === 'string' && r.querystring.length > 0) {
      qs = r.querystring.indexOf('?') === 0 ? r.querystring : '?' + r.querystring;
    } else if (typeof r.querystring === 'object') {
      var pairs = [];
      for (var k in r.querystring) {
        if (Object.prototype.hasOwnProperty.call(r.querystring, k)) {
          var item = r.querystring[k];
          if (item && item.multiValue && item.multiValue.length) {
            for (var i = 0; i < item.multiValue.length; i++) {
              pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(item.multiValue[i].value));
            }
          } else if (item && item.value !== undefined && item.value !== '') {
            pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(item.value));
          } else {
            pairs.push(encodeURIComponent(k));
          }
        }
      }
      if (pairs.length > 0) {
        qs = '?' + pairs.join('&');
      }
    }
  }

  // 2. Canonical Host Validation & Redirect
  // If request arrives at www.dhruvpatel.net, redirect permanently to canonical apex domain
  if (host === 'www.' + canonicalHost) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://' + canonicalHost + r.uri + qs }
      }
    };
  }

  // If host is provided and does not match canonicalHost or www.canonicalHost,
  // reject malicious / spoofed host headers with HTTP 400 Bad Request to prevent Open Redirects (CWE-601)
  if (host && host !== canonicalHost) {
    return {
      statusCode: 400,
      statusDescription: 'Bad Request',
      body: 'Invalid Host header'
    };
  }

  // 3. Trailing Slash Normalization for Folders
  // If the URI does not end with '/' and the final path segment does not contain a file extension dot ('.'),
  // issue an HTTP 301 redirect so the browser updates its base URI.
  var lastSegment = r.uri.split('/').pop();
  if (!r.uri.endsWith('/') && lastSegment.indexOf('.') === -1) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://' + canonicalHost + r.uri + '/' + qs }
      }
    };
  }

  // 4. S3 Origin Index Mapping
  // For directory paths ending in '/', map to 'index.html' internally so S3 serves the page
  if (r.uri.endsWith('/')) {
    r.uri += 'index.html';
  }

  return r;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handler: handler };
}
