// Import both toast implementations but with distinct names
import { useToast as useToastRadix, toast as toastRadix } from "@/hooks/use-toast";
import { toast as toastSonner } from "sonner";

// Check if we're offline before showing a toast
const checkNetworkBeforeToast = (fn: Function, ...args: any[]) => {
  // Get network status
  let isOnline = true;
  try {
    isOnline = navigator.onLine;
  } catch (e) {
    // Ignore errors from navigator.onLine
  }
  
  // Always show offline related toasts
  const message = args[0]?.title || '';
  const description = args[0]?.description || '';
  
  if (message.includes('offline') || 
      description.includes('offline') || 
      message.includes('connection') || 
      description.includes('connection') ||
      isOnline) {
    return fn(...args);
  }
  
  // Otherwise, don't show non-critical toasts when offline
  return null;
};

// Wrap the toast functions to check network status
const networkSafeRadixToast = (...args: Parameters<typeof toastRadix>) => 
  checkNetworkBeforeToast(toastRadix, ...args);

const networkSafeSonnerToast = (...args: Parameters<typeof toastSonner>) => 
  checkNetworkBeforeToast(toastSonner, ...args);

// Export them with clear naming to avoid conflicts
export { 
  useToastRadix as useToast, 
  networkSafeRadixToast as toast, 
  networkSafeSonnerToast as toastSonner 
};
