
// Import both toast implementations but with distinct names
import { useToast as useToastRadix, toast as toastRadix } from "@/hooks/use-toast";
import { toast as toastSonner } from "sonner";

// Export them with clear naming to avoid conflicts
export { useToastRadix as useToast, toastRadix as toast, toastSonner };
