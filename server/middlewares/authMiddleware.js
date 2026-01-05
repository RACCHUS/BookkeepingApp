import { firebaseAdmin } from '../config/index.js';
import { logger } from '../config/index.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { getDbProvider, DB_PROVIDERS } from '../services/adapters/index.js';

/**
 * Get the configured auth provider
 * Uses DB_PROVIDER by default, but can be overridden with AUTH_PROVIDER
 */
function getAuthProvider() {
  return process.env.AUTH_PROVIDER?.toLowerCase() || getDbProvider();
}

/**
 * Verify a Supabase JWT token
 * @param {string} token - The JWT token
 * @returns {Promise<object>} The decoded user data
 */
async function verifySupabaseToken(token) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  
  const supabase = getSupabaseAdmin();
  
  // Use Supabase's built-in token verification
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error(error?.message || 'Invalid token');
  }
  
  return {
    uid: user.id,
    email: user.email,
    emailVerified: user.email_confirmed_at != null,
    displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
    photoURL: user.user_metadata?.avatar_url,
    provider: user.app_metadata?.provider || 'email',
    customClaims: user.app_metadata || {},
    authTime: new Date(user.last_sign_in_at),
    createdAt: new Date(user.created_at)
  };
}

/**
 * Verify a Firebase JWT token
 * @param {string} token - The JWT token
 * @returns {Promise<object>} The decoded user data
 */
async function verifyFirebaseToken(token) {
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
  
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    emailVerified: decodedToken.email_verified,
    displayName: decodedToken.name,
    photoURL: decodedToken.picture,
    provider: decodedToken.firebase.sign_in_provider,
    customClaims: decodedToken.customClaims || {},
    authTime: new Date(decodedToken.auth_time * 1000),
    issuedAt: new Date(decodedToken.iat * 1000),
    expiresAt: new Date(decodedToken.exp * 1000)
  };
}

/**
 * Strict authentication middleware that supports both Firebase and Supabase tokens
 * The auth provider is determined by AUTH_PROVIDER or DB_PROVIDER env var
 * Use this for routes that absolutely require authentication
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authProvider = getAuthProvider();
    
    // Check if auth service is available
    if (authProvider === DB_PROVIDERS.FIREBASE && !firebaseAdmin) {
      logger.error('Firebase Admin not initialized for strict auth');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Authentication service is not available'
      });
    }
    
    if (authProvider === DB_PROVIDERS.SUPABASE && !isSupabaseConfigured()) {
      logger.error('Supabase not configured for strict auth');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Authentication service is not available'
      });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authorization token is required'
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the token with the appropriate provider
      let userData;
      
      if (authProvider === DB_PROVIDERS.SUPABASE) {
        userData = await verifySupabaseToken(token);
      } else {
        userData = await verifyFirebaseToken(token);
      }
      
      // Add user information to request object
      req.user = userData;
      req.authProvider = authProvider;

      logger.debug('User authenticated successfully', {
        uid: req.user.uid,
        email: req.user.email,
        provider: authProvider
      });

      next();
    } catch (tokenError) {
      logger.warn('Token verification failed', {
        error: tokenError.message,
        authProvider,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'The provided token is invalid, expired, or malformed'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'An internal error occurred during authentication'
    });
  }
};

export default authMiddleware;
