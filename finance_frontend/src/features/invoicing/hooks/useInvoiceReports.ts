import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchCustomers, fetchProjects, fetchLocations, generateInvoiceReports } from '../api/reportsService';

export const useMasterData = () => {
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  return {
    customers: customersQuery.data || [],
    projects: projectsQuery.data || [],
    locations: locationsQuery.data || [],
    isLoading: customersQuery.isLoading || projectsQuery.isLoading || locationsQuery.isLoading,
  };
};

export const useGenerateInvoiceReports = () => {
  return useMutation({
    mutationFn: (filters: {
      customerId: number;
      projectId: number;
      locationId: string;
      tripType: string;
      startDate: string;
      endDate: string;
    }) => generateInvoiceReports(filters),
  });
};
