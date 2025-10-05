export interface UserProfile {
  id: string;
  full_name: string;
  role: 'user' | 'admin';
  token_balance: number;
  total_tokens_purchased: number;
  total_tokens_consumed: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  token_amount: number;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  package_id: string | null;
  amount: number;
  token_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  payment_id: string;
  created_at: string;
  updated_at: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  tokens_consumed: number;
  chat_id: string;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
