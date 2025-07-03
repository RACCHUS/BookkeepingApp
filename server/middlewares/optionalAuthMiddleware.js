// Optional authentication middleware that works with or without Firebase
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Check if we're in development mode or Firebase is not available
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Get admin instance dynamically
    let admin = null;
    try {
      const firebaseAdminModule = await import('../config/firebaseAdmin.js');
      admin = firebaseAdminModule.default;
    } catch (error) {
      console.log('Firebase not available, using mock user');
    }

    if (!admin) {
      // Mock user ONLY if Firebase is not available (not just for development)
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        email_verified: true,
        name: 'Development User'
      };
      console.log('🔓 Using mock authentication because Firebase is not available');
      return next();
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization token provided'
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the token with Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Add user information to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        name: decodedToken.name || decodedToken.email,
        firebase_claims: decodedToken
      };

      console.log(`✅ Authenticated user: ${req.user.email}`);
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication service error'
    });
  }
};

export default optionalAuthMiddleware;
