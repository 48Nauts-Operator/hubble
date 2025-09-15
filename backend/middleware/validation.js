// ABOUTME: Common validation middleware to reduce DRY violations across routes
// ABOUTME: Provides reusable validation chains for common fields like names, URLs, descriptions, etc.

const { body, validationResult } = require('express-validator');

// Cache for validation chains to improve performance
const validationCache = new Map();

// Helper function to get or create cached validation chain
const getCachedValidation = (key, createChain) => {
  if (!validationCache.has(key)) {
    validationCache.set(key, createChain());
  }
  return validationCache.get(key);
};

// Common field validation chains
const validationChains = {
  // Text fields with XSS protection
  name: (required = true, maxLength = 255) => {
    const chain = body('name')
      .trim()
      .isLength({ min: 1, max: maxLength })
      .matches(/^[a-zA-Z0-9\s\-_.()\[\]{}@#&]+$/)
      .withMessage('Name contains invalid characters');
    return required ? chain.notEmpty() : chain.optional();
  },

  description: (required = false, maxLength = 1000) => {
    const chain = body('description')
      .trim()
      .isLength({ max: maxLength })
      .escape(); // Escape HTML to prevent XSS
    return required ? chain.notEmpty() : chain.optional();
  },

  title: (required = true, maxLength = 255) => {
    const chain = body('title')
      .trim()
      .isLength({ min: 1, max: maxLength })
      .escape(); // Escape HTML to prevent XSS
    return required ? chain.notEmpty() : chain.optional();
  },

  // URL fields with protocol whitelisting for security
  url: (required = true) => {
    const chain = body('url')
      .isURL({
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
      })
      .custom(value => {
        // Additional security: block dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
        const lowerValue = value?.toLowerCase() || '';
        for (const protocol of dangerousProtocols) {
          if (lowerValue.startsWith(protocol)) {
            throw new Error(`Dangerous protocol ${protocol} not allowed`);
          }
        }
        return true;
      });
    return required ? chain.notEmpty() : chain.optional();
  },

  internal_url: () => body('internal_url').optional()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })
    .custom(value => {
      if (!value) return true;
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      const lowerValue = value.toLowerCase();
      for (const protocol of dangerousProtocols) {
        if (lowerValue.startsWith(protocol)) {
          throw new Error(`Dangerous protocol ${protocol} not allowed`);
        }
      }
      return true;
    }),

  external_url: () => body('external_url').optional()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })
    .custom(value => {
      if (!value) return true;
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      const lowerValue = value.toLowerCase();
      for (const protocol of dangerousProtocols) {
        if (lowerValue.startsWith(protocol)) {
          throw new Error(`Dangerous protocol ${protocol} not allowed`);
        }
      }
      return true;
    }),

  // Common optional fields
  icon: (maxLength = 200) => body('icon').optional().trim().isLength({ max: maxLength }),
  color: () => body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  tags: () => body('tags').optional().isArray(),
  
  // ID fields with format validation
  group_id: () => body('group_id')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid group ID format'),
  parent_id: () => body('parent_id').optional(),
  session_id: () => body('session_id')
    .notEmpty()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid session ID format'),

  // Enumeration fields
  environment: () => body('environment').optional().isIn(['production', 'staging', 'uat', 'development', 'local']),
  access_type: () => body('access_type').optional().isIn(['public', 'restricted', 'expiring']),
  theme: () => body('theme').optional().isIn(['light', 'dark', 'auto']),
  layout: () => body('layout').optional().isIn(['grid', 'list', 'compact', 'card']),
  view_mode: () => body('view_mode').optional().isIn(['grid', 'list', 'compact']),

  // Date/time fields
  expires_at: () => body('expires_at').optional().isISO8601(),

  // Numeric fields
  max_uses: () => body('max_uses').optional().isInt({ min: 1 }),
  sort_order: () => body('sort_order').optional().isInt(),

  // Boolean fields
  remember: () => body('remember').optional().isBoolean(),
  show_groups: () => body('show_groups').optional().isBoolean(),
  show_search: () => body('show_search').optional().isBoolean(),
  show_filters: () => body('show_filters').optional().isBoolean(),

  // Array fields
  personal_bookmarks: () => body('personal_bookmarks').optional().isArray(),
  personal_groups: () => body('personal_groups').optional().isArray(),
  hidden_bookmarks: () => body('hidden_bookmarks').optional().isArray(),
  favorite_bookmarks: () => body('favorite_bookmarks').optional().isArray(),
  included_groups: () => body('included_groups').optional().isArray(),
  excluded_groups: () => body('excluded_groups').optional().isArray(),
  included_tags: () => body('included_tags').optional().isArray(),
  excluded_tags: () => body('excluded_tags').optional().isArray(),
  environments: () => body('environments').optional().isArray(),

  // Object fields
  custom_tags: () => body('custom_tags').optional().isObject(),
  permissions: () => body('permissions').optional().isObject(),
  branding: () => body('branding').optional().isObject(),
  custom_branding: () => body('custom_branding').optional().isObject(),
  notes: () => body('notes').optional().isObject(),

  // Auth fields with strong validation
  password: (required = true) => {
    const chain = body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one lowercase, uppercase, number, and special character');
    return required ? chain.notEmpty() : chain.optional();
  },
  email: () => body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  // Special fields
  custom_css: () => body('custom_css')
    .optional()
    .trim()
    .custom(value => {
      if (!value) return true;
      // Block dangerous CSS patterns
      const dangerous = [
        'javascript:',
        'expression(',
        '@import',
        '</style>',
        '<script'
      ];
      const lowerValue = value.toLowerCase();
      for (const pattern of dangerous) {
        if (lowerValue.includes(pattern)) {
          throw new Error(`Dangerous CSS pattern detected: ${pattern}`);
        }
      }
      return true;
    }),
  health_status: () => body('health_status').optional().isIn(['unknown', 'healthy', 'unhealthy', 'timeout'])
};

// Optimized validation result handler middleware with caching
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Use more efficient error processing
    const errorArray = errors.array({ onlyFirstError: true }); // Only get first error per field
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorArray.map(error => ({
        param: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Performance-optimized validation error handler for high-traffic endpoints
const handleValidationErrorsFast = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Minimal error response for better performance
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Pre-built validation middleware for common scenarios
const bookmarkValidation = [
  validationChains.title(),
  validationChains.url(),
  validationChains.internal_url(),
  validationChains.external_url(),
  validationChains.group_id(),
  validationChains.description(),
  validationChains.icon(),
  validationChains.tags(),
  validationChains.color(),
  validationChains.environment(),
  handleValidationErrors
];

const groupValidation = [
  validationChains.name(),
  validationChains.icon(),
  validationChains.description(),
  validationChains.color(),
  validationChains.parent_id(),
  validationChains.sort_order(),
  handleValidationErrors
];

const shareValidation = [
  validationChains.name(),
  validationChains.description(),
  validationChains.access_type(),
  validationChains.expires_at(),
  validationChains.max_uses(),
  validationChains.included_groups(),
  validationChains.excluded_groups(),
  validationChains.included_tags(),
  validationChains.excluded_tags(),
  validationChains.theme(),
  validationChains.layout(),
  validationChains.permissions(),
  validationChains.branding(),
  handleValidationErrors
];

const authValidation = {
  setup: [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number and one special character'),
    validationChains.email(),
    handleValidationErrors
  ],
  login: [
    body('password').notEmpty(),
    validationChains.remember(),
    handleValidationErrors
  ]
};

// Cached validation middleware for high-performance scenarios
const cachedBookmarkValidation = (() => {
  const cacheKey = 'bookmark_validation';
  return getCachedValidation(cacheKey, () => [
    validationChains.title(),
    validationChains.url(),
    validationChains.internal_url(),
    validationChains.external_url(),
    validationChains.group_id(),
    validationChains.description(),
    validationChains.icon(),
    validationChains.tags(),
    validationChains.color(),
    validationChains.environment(),
    handleValidationErrors
  ]);
})();

const cachedGroupValidation = (() => {
  const cacheKey = 'group_validation';
  return getCachedValidation(cacheKey, () => [
    validationChains.name(),
    validationChains.icon(),
    validationChains.description(),
    validationChains.color(),
    validationChains.parent_id(),
    validationChains.sort_order(),
    handleValidationErrors
  ]);
})();

module.exports = {
  validationChains,
  handleValidationErrors,
  handleValidationErrorsFast,
  bookmarkValidation,
  groupValidation,
  shareValidation,
  authValidation,
  cachedBookmarkValidation,
  cachedGroupValidation,
  // Performance utilities
  getCachedValidation,
  clearValidationCache: () => validationCache.clear()
};