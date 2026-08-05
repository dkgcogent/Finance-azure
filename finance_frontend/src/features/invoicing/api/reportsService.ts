import { API_BASE_URL as API_URL } from '@/lib/api';

export const fetchCustomers = async () => {
  const response = await fetch(`${API_URL}/invoicing/customers`);
  if (!response.ok) throw new Error('Failed to fetch customers');
  return response.json();
};

export const fetchProjects = async () => {
  const response = await fetch(`${API_URL}/invoicing/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
};

export const fetchLocations = async () => {
  const response = await fetch(`${API_URL}/invoicing/locations`);
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
};

export const generateInvoiceReports = async (filters: {
  customerId: number;
  projectId: number;
  locationId: number;
  tripType: string;
  startDate: string;
  endDate: string;
}) => {
  const response = await fetch(`${API_URL}/invoicing/generate-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!response.ok) throw new Error('Failed to generate reports');
  return response.json();
};
