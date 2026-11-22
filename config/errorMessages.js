/**
 * Translates Firebase Auth, Firestore, AI, and network errors into clean,
 * user-friendly messages without exposing developer/technical details.
 */

export function getAuthErrorMessage(error, context = 'signin') {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();

  if (code === 'auth/wrong-password') {
    return 'Wrong password. Please try again or tap Forgot Password.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account was found with that email address.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'Incorrect email or password. Please double-check and try again.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please choose at least 6 characters.';
  }
  if (code === 'auth/missing-password') {
    return 'Please enter your password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled. Please contact support.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network')) {
    return 'No internet connection. Please check your network and try again.';
  }
  if (code === 'permission-denied' || msg.includes('insufficient permissions')) {
    return 'We could not load your account right now. Please try again in a moment.';
  }

  if (context === 'signup') {
    return 'We could not create your account right now. Please try again.';
  }
  if (context === 'reset') {
    return 'We could not send the password reset email. Please check your email and try again.';
  }
  if (context === 'verify') {
    return 'We could not check your verification status right now. Please try again.';
  }
  return 'Incorrect email or password. Please try again.';
}

export function getFriendlyErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status) || 0;
  const raw = String(error?.message || '');
  const lower = raw.toLowerCase();

  if (
    status === 429 ||
    status === 503 ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return 'Our AI coach is a bit busy right now. Please wait a few seconds and try again.';
  }

  if (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('canceled') ||
    lower.includes('cancelled')
  ) {
    return 'That took a bit too long. Please check your connection and try again.';
  }

  if (
    code === 'auth/network-request-failed' ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('offline')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  if (lower.includes('blocked')) {
    return 'We could not generate content for that topic. Try rephrasing your request.';
  }

  if (
    code === 'permission-denied' ||
    lower.includes('insufficient permissions') ||
    lower.includes('firestore')
  ) {
    return 'We could not save or load your data right now. Please try again shortly.';
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('expo_public') ||
    lower.includes('.env') ||
    lower.includes('not configured')
  ) {
    return 'This AI feature is temporarily unavailable. Please try again later.';
  }

  if (
    lower.includes('json') ||
    lower.includes('syntaxerror') ||
    lower.includes('unexpected token')
  ) {
    return 'We had trouble preparing that response. Please try again.';
  }

  // Allow short, clean messages that don't look like technical/developer errors
  const looksTechnical =
    /firebase|firestore|http|status \d|error:|exception|undefined|null|stack|token|env|proxy|gemini|api/i.test(
      raw
    );

  if (raw && raw.length <= 140 && !looksTechnical) {
    return raw;
  }

  return fallback;
}
