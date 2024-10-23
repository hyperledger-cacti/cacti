/**
 * A list of well-known headers as published on Wikipedia.
 * @see https://en.wikipedia.org/wiki/List_of_HTTP_header_fields
 *
 * TODO Finish documenting each enum item and make sure to also include
 * the examples provided on the linked Wikipedia page above. The first
 * few headers are documented this way but we need all of them like that.
 *
 * TODO Ensure that there are no typos in the header names.
 */
export enum HttpHeader {
  // Standard request fields

  /**
   * Acceptable instance-manipulations for the request.
   * @example A-IM: feed
   * @see https://datatracker.ietf.org/doc/html/rfc3229
   */
  A_IM = "A-IM",
  /**
   * Media type(s) that is/are acceptable for the response. See Content negotiation.
   * @example Accept: text/html
   * @see https://datatracker.ietf.org/doc/html/rfc9110
   */
  Accept = "Accept",
  /**
   * Character sets that are acceptable.
   * @example Accept-Charset: utf-8
   * @see https://datatracker.ietf.org/doc/html/rfc9110
   */
  AcceptCharset = "Accept-Charset",
  /**
   * Acceptable version in time.
   * @example Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT
   * @see https://datatracker.ietf.org/doc/html/rfc7089
   */
  AcceptDatetime = "Accept-Datetime",
  AcceptEncoding = "Accept-Encoding",
  AcceptLanguage = "Accept-Language",
  AccessControlAllowOrigin = "Access-Control-Allow-Origin",
  AccessControlAllowCredentials = "Access-Control-Allow-Credentials",
  AccessControlExposeHeaders = "Access-Control-Expose-Headers",
  AccessControlMaxAge = "Access-Control-Max-Age",
  AccessControlAllowMethods = "Access-Control-Allow-Methods",
  AccessControlAllowHeaders = "Access-Control-Allow-Headers",
  Authorization = "Authorization",
  CacheControl = "Cache-Control",
  Connection = "Connection",
  ContentDisposition = "Content-Disposition",
  ContentEncoding = "Content-Encoding",
  ContentLength = "Content-Length",
  ContentLocation = "Content-Location",
  ContentMD5 = "Content-MD5",
  ContentType = "Content-Type",
  Cookie = "Cookie",
  Date = "Date",
  Expect = "Expect",
  Forwarded = "Forwarded",
  From = "From",
  Host = "Host",
  IfMatch = "If-Match",
  IfModifiedSince = "If-Modified-Since",
  IfNoneMatch = "If-None-Match",
  IfRange = "If-Range",
  IfUnmodifiedSince = "If-Unmodified-Since",
  MaxForwards = "Max-Forwards",
  Origin = "Origin",
  Pragma = "Pragma",
  Prefer = "Prefer",
  ProxyAuthorization = "Proxy-Authorization",
  Range = "Range",
  Referer = "Referer",
  TE = "TE",
  Trailer = "Trailer",
  TransferEncoding = "Transfer-Encoding",
  Upgrade = "Upgrade",
  UserAgent = "User-Agent",

  // Common non-standard request fields
  UpgradeInsecureRequests = "Upgrade-Insecure-Requests",
  XRequestedWith = "X-Requested-With",
  DNT = "DNT",
  XForwardedFor = "X-Forwarded-For",
  XForwardedHost = "X-Forwarded-Host",
  XForwardedProto = "X-Forwarded-Proto",
  FrontEndHttps = "Front-End-Https",
  XHttpMethodOverride = "X-Http-Method-Override",
  XAttDeviceId = "X-Att-DeviceId",
  XWapProfile = "X-Wap-Profile",
  ProxyConnection = "Proxy-Connection",
  XUIDH = "X-UIDH",
  XCsrfToken = "X-Csrf-Token",
  XRequestId = "X-Request-ID", // Alternative X-Request-Id
  CorrelationId = "X-Correlation-ID", // Alternative Correlation-ID
  SaveData = "Save-Data",
  SecGpc = "Sec-GPC",

  // Standard response fields
  AcceptCH = "Accept-CH",
  AcceptPatch = "Accept-Patch",
  AltSvc = "Alt-Svc",
  Age = "Age",
  Allow = "Allow",
  Expires = "Expires",
  IM = "IM",
  LastModified = "Last-Modified",
  Link = "Link",
  Location = "Location",
  P3P = "P3P",
  ProxyAuthenticate = "Proxy-Authenticate",
  PublicKeyPins = "Public-Key-Pins",
  /**
   * f an entity is temporarily unavailable, this instructs the client
   * to try again later. Value could be a specified period of time
   * (in seconds) or a HTTP-date.
   *
   * There are two accepted formats when it comes to the values of the header:
   * ```http
   * Retry-After: <http-date>
   * Retry-After: <delay-seconds>
   * ```
   *
   * `<http-date>`
   * A date after which to retry. See the Date header for more details on the HTTP date format.
   *
   * `<delay-seconds>`
   * A non-negative decimal integer indicating the seconds to delay after the response is received.
   *
   * @example Retry-After: 120
   * @example Retry-After: Fri, 07 Nov 2014 23:59:59 GMT
   *
   * @see https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.3
   */
  RetryAfter = "Retry-After",
  Server = "Server",
  SetCookie = "Set-Cookie",
  StrictTransportSecurity = "Strict-Transport-Security",
  Tk = "Tk",
  Vary = "Vary",
  Via = "Via", // Same as request field
  /**
   * Indicates the authentication scheme that should be used to access the requested entity.
   * @example WWW-Authenticate: Basic
   * @see https://datatracker.ietf.org/doc/html/rfc9110
   */
  WWWAuthenticate = "WWW-Authenticate",
  XFrameOptions = "X-Frame-Options",

  // Common non-standard response fields
  ContentSecurityPolicy = "Content-Security-Policy",
  ExpectCT = "Expect-CT",
  NEL = "NEL",
  PermissionsPolicy = "Permissions-Policy",
  Refresh = "Refresh",
  ReportTo = "Report-To",
  Timing_Allow_Origin = "Timing-Allow-Origin",
}
