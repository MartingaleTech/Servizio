export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: 'customer' | 'worker' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  city?: string;
  bio?: string;
  profile_photo_url?: string;
  roles_interested?: string;
  experience_level: string;
  languages?: string;
  home_latitude?: number;
  home_longitude?: number;
  max_travel_distance_km: number;
  is_accepting_jobs: boolean;
  average_rating: number;
  total_reviews: number;
  total_events_completed: number;
  verification_status: string;
  full_name?: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  organization_name?: string;
  profile_photo_url?: string;
  average_rating: number;
  total_reviews: number;
  total_events: number;
  full_name?: string;
}

export interface IDVerification {
  id: string;
  user_id: string;
  government_id_front_url?: string;
  government_id_back_url?: string;
  selfie_url?: string;
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Availability {
  id: string;
  user_id: string;
  day_of_week?: number;
  specific_date?: string;
  start_time?: string;
  end_time?: string;
  is_unavailable: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  customer_id: string;
  name: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  address: string;
  latitude?: number;
  longitude?: number;
  guest_count?: number;
  servers_needed: number;
  bartenders_needed: number;
  cleaners_needed: number;
  dress_code?: string;
  special_instructions?: string;
  status: string;
  created_at: string;
  customer_name?: string;
}

export interface Quote {
  id: string;
  event_id: string;
  customer_id: string;
  servers_count: number;
  servers_rate: number;
  bartenders_count: number;
  bartenders_rate: number;
  cleaners_count: number;
  cleaners_rate: number;
  hours: number;
  subtotal: number;
  platform_fee: number;
  total: number;
  is_accepted: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  event_id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  platform_fee: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
  event_name?: string;
}

export interface Shift {
  id: string;
  event_id: string;
  booking_id: string;
  worker_id: string;
  role: string;
  status: string;
  clock_in_time?: string;
  clock_out_time?: string;
  planned_start?: string;
  planned_end?: string;
  hours_worked?: number;
  pay_amount?: number;
  is_overtime: boolean;
  overtime_hours: number;
  overtime_approved?: boolean | null;
  worker_latitude?: number;
  worker_longitude?: number;
  eta_minutes?: number;
  arrived_at?: string;
  created_at: string;
  event_name?: string;
  worker_name?: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  event_id: string;
  customer_id: string;
  amount: number;
  platform_fee: number;
  total: number;
  status: string;
  issued_at: string;
  paid_at?: string;
  event_name?: string;
}

export interface Payout {
  id: string;
  worker_id: string;
  shift_id: string;
  event_id: string;
  amount: number;
  tip_amount: number;
  status: string;
  payout_method?: string;
  paid_at?: string;
  created_at: string;
  event_name?: string;
}

export interface Rating {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  rating: number;
  review_text?: string;
  rating_type: string;
  created_at: string;
  from_user_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface PricingRule {
  id: string;
  role: string;
  hourly_rate: number;
  platform_fee_percent: number;
}

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_workers: number;
  total_events: number;
  total_bookings: number;
  pending_verifications: number;
  total_revenue: number;
  total_payouts: number;
}

export interface Earnings {
  total_earned: number;
  total_pending: number;
  total_tips: number;
  weekly_earnings: number;
  monthly_earnings: number;
  weekly_tips: number;
  monthly_tips: number;
  payouts: {
    id: string;
    amount: number;
    status: string;
    event_name?: string;
    created_at?: string;
    paid_at?: string;
  }[];
  completed_shifts_count: number;
}

// V1 Types

export interface ChatRoom {
  id: string;
  event_id?: string;
  room_type: string;
  name?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  members: string[];
  last_message?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  is_quick_message: boolean;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export interface Tip {
  id: string;
  event_id: string;
  booking_id: string;
  from_customer_id: string;
  to_worker_id?: string;
  amount: number;
  split_type: string;
  status: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  event_id: string;
  booking_id?: string;
  filed_by: string;
  filed_against?: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution?: string;
  resolved_by?: string;
  refund_amount?: number;
  payout_adjustment?: number;
  created_at: string;
  filed_by_name?: string;
  filed_against_name?: string;
}

export interface CancellationPolicy {
  id: string;
  policy_type: string;
  hours_before_free_cancel: number;
  late_cancel_fee_percent: number;
  no_show_fee_percent: number;
  worker_cancel_rating_penalty: number;
  worker_cancel_suspension_hours: number;
}
