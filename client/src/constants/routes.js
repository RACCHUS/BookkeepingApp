// Application Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:id',
  COMPANIES: '/companies',
  COMPANY_DETAIL: '/companies/:id',
  UPLOADS: '/uploads',
  UPLOAD_DETAIL: '/uploads/:id',
  REPORTS: '/reports',
  PAYEES: '/payees',
  PAYEE_DETAIL: '/payees/:id',
  CLASSIFICATION: '/classification',
  SETTINGS: '/settings',
  LOGIN: '/login',
  REGISTER: '/register',
  NOT_FOUND: '/404',
};

// Navigation Items
export const NAVIGATION = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'HomeIcon',
    current: false,
  },
  {
    name: 'Transactions',
    href: ROUTES.TRANSACTIONS,
    icon: 'CreditCardIcon',
    current: false,
  },
  {
    name: 'Companies',
    href: ROUTES.COMPANIES,
    icon: 'BuildingOfficeIcon',
    current: false,
  },
  {
    name: 'Uploads',
    href: ROUTES.UPLOADS,
    icon: 'DocumentArrowUpIcon',
    current: false,
  },
  {
    name: 'Reports',
    href: ROUTES.REPORTS,
    icon: 'ChartBarIcon',
    current: false,
  },
  {
    name: 'Payees',
    href: ROUTES.PAYEES,
    icon: 'UsersIcon',
    current: false,
  },
  {
    name: 'Classification',
    href: ROUTES.CLASSIFICATION,
    icon: 'TagIcon',
    current: false,
  },
];

// Breadcrumb Configuration
export const BREADCRUMB_NAMES = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.TRANSACTIONS]: 'Transactions',
  [ROUTES.COMPANIES]: 'Companies',
  [ROUTES.UPLOADS]: 'Uploads',
  [ROUTES.REPORTS]: 'Reports',
  [ROUTES.PAYEES]: 'Payees',
  [ROUTES.CLASSIFICATION]: 'Classification',
  [ROUTES.SETTINGS]: 'Settings',
};
