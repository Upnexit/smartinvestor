import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));

// Read storage policies from earlier query or define them accurately
const storageBuckets = [
  { id: 'avatars', name: 'avatars', public: true },
  { id: 'community-voice', name: 'community-voice', public: false },
  { id: 'package-images', name: 'package-images', public: true },
  { id: 'payment-logos', name: 'payment-logos', public: true },
  { id: 'payment-screenshots', name: 'payment-screenshots', public: false }
];

// Let's create helper to map tables
const tableOrder = [
  'profiles',
  'user_roles',
  'packages',
  'distributor_packages',
  'site_settings',
  'notices',
  'notice_deletion_log',
  'notice_dismissals',
  'communities',
  'community_bans',
  'community_messages',
  'link_tasks',
  'task_submissions',
  'user_packages',
  'user_payment_methods',
  'referral_earnings',
  'withdrawals',
  'shop_products',
  'shop_orders',
  'distributors',
  'distributor_applications',
  'distributor_earnings',
  'distributor_leads',
  'distributor_package_orders',
  'distributor_tasks',
  'distributor_withdrawals',
  'deleted_users_archive',
  'spin_wheel_slices',
  'spin_history',
  'push_subscriptions',
  'email_otps',
  'activity_logs',
  'error_logs'
];

console.log('Total tables in raw dump:', new Set(raw.columns.map(c => c.table_name)).size);
console.log('Table order count:', tableOrder.length);
