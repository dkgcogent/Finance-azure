import { useAuth, Role } from "@/contexts/AuthContext";

export function usePermissions() {
  const { role } = useAuth();
  
  const isAdmin = role?.toLowerCase() === "admin";

  const permissions = {
    // Invoice Creation
    canCreateInvoice: isAdmin || role === "Billing Executive",
    
    // Credit/Debit Note Creation
    canCreateNote: isAdmin || role === "Billing Executive",

    // Approvals
    canApproveLevel1: isAdmin || role === "Operations Head",
    canApproveLevel2: isAdmin || role === "CEO",
    
    // Resubmit Rejected Notes
    canResubmitNote: isAdmin || role === "Billing Executive",

    // Viewing (Usually everyone can view based on the requirement, but could restrict)
    canViewAllHistory: true, 
  };

  return permissions;
}
