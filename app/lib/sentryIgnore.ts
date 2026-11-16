// Errors that come from outside the app and aren't worth an alert.
//
// "Object Not Found Matching Id:1, MethodName:update, ParamCount:4" is thrown
// by Microsoft's link scanner (Outlook / Defender Safe Links) when it opens a
// link from an email in its own browser, not by our code.
export const sentryIgnoreErrors: RegExp[] = [
  /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/,
]
