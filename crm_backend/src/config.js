// Business rules shared by every controller. The mobile app reads these from
// the API instead of keeping its own copy.
module.exports = {
  LOW_STOCK_AT: 4,         // a product with this many (or fewer) in stock counts as low
  OVERDUE_AFTER_DAYS: 7,   // a repair with no promised date is flagged overdue after this many days
  REMIND_DAYS_BEFORE: 1,   // remind about a repair this many days before its promised date
  ROLES: ['owner', 'sales', 'technician'],
};
