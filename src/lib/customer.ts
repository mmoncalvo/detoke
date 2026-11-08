// The buyer's details for the checkout, kept in this browser (and in the account when signed in).
export const CUSTOMER_KEY = 'detoke.customer';

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
}

export function readCustomer(): CustomerDetails {
  try {
    return { name: '', phone: '', address: '', ...JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? '{}') };
  } catch {
    return { name: '', phone: '', address: '' };
  }
}

export function writeCustomer(details: CustomerDetails) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(details));
  } catch {
    /* storage not available */
  }
}
