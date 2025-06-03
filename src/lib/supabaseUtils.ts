
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseHealthStatus {
  isHealthy: boolean;
  latency?: number;
  error?: string;
}

export class SupabaseConnectionManager {
  private static instance: SupabaseConnectionManager;
  private healthCheckCache: { status: SupabaseHealthStatus; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  static getInstance(): SupabaseConnectionManager {
    if (!SupabaseConnectionManager.instance) {
      SupabaseConnectionManager.instance = new SupabaseConnectionManager();
    }
    return SupabaseConnectionManager.instance;
  }

  async checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
    // Return cached result if still valid
    if (this.healthCheckCache && 
        Date.now() - this.healthCheckCache.timestamp < this.CACHE_DURATION) {
      return this.healthCheckCache.status;
    }

    const startTime = Date.now();
    
    try {
      // Simple health check - try to connect to Supabase
      const { error } = await supabase.from('user_profiles').select('id').limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        const status: SupabaseHealthStatus = {
          isHealthy: false,
          latency,
          error: error.message
        };
        
        this.healthCheckCache = { status, timestamp: Date.now() };
        return status;
      }

      const status: SupabaseHealthStatus = {
        isHealthy: true,
        latency
      };
      
      this.healthCheckCache = { status, timestamp: Date.now() };
      return status;
    } catch (error: any) {
      const status: SupabaseHealthStatus = {
        isHealthy: false,
        latency: Date.now() - startTime,
        error: error.message || 'Unknown connection error'
      };
      
      this.healthCheckCache = { status, timestamp: Date.now() };
      return status;
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Supabase operation'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a network-related error
        const isNetworkError = this.isNetworkError(error);
        
        if (!isNetworkError || attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        // Wait with exponential backoff
        const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`${operationName} failed (attempt ${attempt}/${this.MAX_RETRIES}), retrying in ${delay}ms...`);
      }
    }
    
    throw lastError;
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    // Network-related error patterns
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'FETCH_ERROR'
    );
  }

  clearCache(): void {
    this.healthCheckCache = null;
  }
}

export const supabaseManager = SupabaseConnectionManager.getInstance();
