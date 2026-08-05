import { differenceInDays, parseISO } from "date-fns";

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const calculateAgingDays = (dueDate: string | null, paymentStatus: string): number | null => {
  if (!dueDate || paymentStatus === "Fully Paid") return null;
  const due = parseISO(dueDate);
  const today = new Date();
  
  // Calculate days difference (positive means overdue)
  const days = differenceInDays(today, due);
  return days > 0 ? days : null;
};
