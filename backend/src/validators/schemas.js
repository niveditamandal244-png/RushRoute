import { z } from 'zod';

export const ALLOWED_VEHICLES = ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV'];
export const ALLOWED_TRANSPORT_MODES = [
  'Bus',
  'BMTC Bus',
  'Metro',
  'Namma Metro',
  'Auto',
  'Walking',
  'Bike',
  'Mini',
  'Sedan',
  'SUV',
  'Any'
];
export const ALLOWED_INCIDENT_CATEGORIES = [
  'Delay',
  'Skipped stop',
  'Overcrowding',
  'Road obstruction',
  'Service disruption',
  'Other'
];
export const ALLOWED_INCIDENT_STATUSES = [
  'reported',
  'under_review',
  'verified',
  'resolved',
  'dismissed'
];

// Coordinate helpers
const latitudeSchema = z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90').optional().nullable();
const longitudeSchema = z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180').optional().nullable();

// Phone helper: optional, rejects emails/letters, accepts optional + country code and 7-15 digits
const optionalPhoneSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return null;
    const trimmed = String(val).trim();
    return trimmed === '' ? null : trimmed;
  },
  z
    .string()
    .nullable()
    .refine(
      (val) => {
        if (val === null) return true;
        if (val.includes('@') || /[A-Za-z]/.test(val)) return false;
        if (!/^\+?[\d\s\-().]+$/.test(val)) return false;
        const digits = val.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      },
      { message: 'Please enter a valid phone number.' }
    )
);

// 1. registerSchema
export const registerSchema = z.object({
  full_name: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),
  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .email('Email address is invalid.')
    .max(150, 'Email address cannot exceed 150 characters.')
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must contain at least 8 characters.')
    .max(100, 'Password cannot exceed 100 characters.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  phone: optionalPhoneSchema
});

// 2. loginSchema
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .email('Email address is invalid.')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required.').max(100)
});

// 3. profileUpdateSchema
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.')
    .optional(),
  phone: optionalPhoneSchema.optional(),
  saved_locations: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(50),
        address: z.string().trim().min(3).max(250),
        latitude: latitudeSchema,
        longitude: longitudeSchema
      })
    )
    .optional()
});

export const userPreferencesUpdateSchema = z.object({
  preferred_transport_modes: z.array(z.string().trim().min(1).max(30)).optional(),
  default_budget: z.number().finite().positive('Default budget must be positive').max(50000).optional(),
  accessibility_preferences: z
    .object({
      wheelchairAccessible: z.boolean().optional(),
      avoidLongWalks: z.boolean().optional(),
      preferDirectRoutes: z.boolean().optional()
    })
    .optional()
});

// 4. journeySearchSchema
export const journeySearchSchema = z
  .object({
    pickup_address: z.string().trim().min(2, 'Starting location is required').max(250),
    destination_address: z.string().trim().min(2, 'Destination is required').max(250),
    pickup_latitude: latitudeSchema,
    pickup_longitude: longitudeSchema,
    destination_latitude: latitudeSchema,
    destination_longitude: longitudeSchema,
    travel_date: z.string().optional().nullable(),
    departure_time: z.string().optional().nullable(),
    passenger_count: z.number().int().min(1).max(6).optional().default(1),
    maximum_budget: z.number().finite().positive('Maximum budget must be positive').max(50000).optional().nullable(),
    preferred_mode: z.enum(ALLOWED_TRANSPORT_MODES).optional().nullable()
  })
  .refine(
    (data) => data.pickup_address.trim().toLowerCase() !== data.destination_address.trim().toLowerCase(),
    {
      message: 'Starting location and destination cannot be identical',
      path: ['destination_address']
    }
  );

// 5. rideRequestSchema
export const rideRequestSchema = z
  .object({
    pickup_address: z.string().trim().min(2, 'Pickup location is required').max(250),
    destination_address: z.string().trim().min(2, 'Destination location is required').max(250),
    pickup_latitude: latitudeSchema,
    pickup_longitude: longitudeSchema,
    destination_latitude: latitudeSchema,
    destination_longitude: longitudeSchema,
    vehicle_type: z.enum(ALLOWED_VEHICLES, {
      errorMap: () => ({ message: `Vehicle category must be one of: ${ALLOWED_VEHICLES.join(', ')}` })
    }),
    passenger_count: z.number().int().min(1).max(6).optional().default(1),
    minimum_budget: z.number().finite().positive('Minimum budget must be positive').max(50000).optional().nullable(),
    maximum_budget: z.number().finite().positive('Maximum budget must be positive').max(50000).optional().nullable(),
    auto_book_cheapest: z.boolean().optional().default(true)
  })
  .refine(
    (data) => data.pickup_address.trim().toLowerCase() !== data.destination_address.trim().toLowerCase(),
    {
      message: 'Pickup and destination cannot be identical',
      path: ['destination_address']
    }
  )
  .refine(
    (data) => {
      if (data.minimum_budget != null && data.maximum_budget != null) {
        return data.minimum_budget <= data.maximum_budget;
      }
      return true;
    },
    {
      message: 'Minimum budget cannot exceed maximum budget',
      path: ['minimum_budget']
    }
  );

// 6. rideBookingSchema
export const rideBookingSchema = z.object({
  ride_request_id: z.string().uuid('Invalid ride request UUID'),
  provider_name: z.string().trim().min(2).max(80),
  vehicle_type: z.enum(ALLOWED_VEHICLES),
  estimated_fare: z.number().finite().positive('Estimated fare must be a positive number'),
  estimated_duration_minutes: z.number().int().positive().optional()
});

// 7. carpoolRequestSchema
export const carpoolRequestSchema = z
  .object({
    pickup_address: z.string().trim().min(2, 'Pickup location is required').max(250),
    destination_address: z.string().trim().min(2, 'Destination is required').max(250),
    pickup_latitude: latitudeSchema,
    pickup_longitude: longitudeSchema,
    destination_latitude: latitudeSchema,
    destination_longitude: longitudeSchema,
    departure_time: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Departure time must be a valid ISO date/time string'
    }),
    available_seats: z.number().int().min(1, 'At least 1 seat is required').max(6, 'Maximum 6 seats allowed'),
    estimated_budget: z.number().finite().positive('Budget must be positive').max(10000).optional().nullable(),
    preferences: z
      .object({
        genderPreference: z.enum(['any', 'same_gender_only']).optional().default('any'),
        quietRide: z.boolean().optional().default(false),
        luggageSpace: z.boolean().optional().default(false)
      })
      .optional()
  })
  .refine(
    (data) => data.pickup_address.trim().toLowerCase() !== data.destination_address.trim().toLowerCase(),
    {
      message: 'Pickup and destination cannot be identical',
      path: ['destination_address']
    }
  );

// 8. carpoolResponseSchema
export const carpoolResponseSchema = z.object({
  action: z.enum(['accept', 'decline', 'report', 'block']),
  reason: z.string().trim().max(300).optional()
});

// 9. incidentReportSchema
export const incidentReportSchema = z.object({
  category: z.enum(ALLOWED_INCIDENT_CATEGORIES, {
    errorMap: () => ({ message: `Incident category must be one of: ${ALLOWED_INCIDENT_CATEGORIES.join(', ')}` })
  }),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1500, 'Description cannot exceed 1500 characters'),
  location: z.string().trim().min(2, 'Location is required').max(250),
  route_name: z.string().trim().max(100).optional().nullable(),
  service_name: z.string().trim().max(100).optional().nullable(),
  supporting_image_url: z.string().trim().url('Supporting image must be a valid URL').max(500).optional().nullable(),
  latitude: latitudeSchema,
  longitude: longitudeSchema
});

// 10. incidentUpdateSchema
export const incidentUpdateSchema = z.object({
  status: z.enum(ALLOWED_INCIDENT_STATUSES),
  ai_summary: z.string().trim().max(1000).optional()
});

// 11. journeyRecommendationSchema (AI output & request validation)
export const journeyRecommendationOutputSchema = z.object({
  recommended_option_id: z.string(),
  reason: z.string(),
  alternatives: z.array(
    z.object({
      option_id: z.string(),
      advantage: z.string(),
      disadvantage: z.string()
    })
  ),
  budget_assessment: z.enum(['within_budget', 'above_budget', 'unknown']),
  warnings: z.array(z.string()),
  data_limitations: z.array(z.string())
});

export const journeyRecommendationSchema = journeyRecommendationOutputSchema;

// 12. incidentAnalysisSchema (AI output validation)
export const incidentAnalysisSchema = z.object({
  summary: z.string(),
  suggested_category: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'unknown']),
  key_details: z.array(z.string()),
  requires_human_review: z.literal(true)
});

// Additional AI response schemas required by Section 15
export const budgetExplanationOutputSchema = z.object({
  cheapest_option_id: z.string(),
  estimated_savings: z.number(),
  explanation: z.string(),
  budget_status: z.enum(['within_budget', 'above_budget', 'unknown'])
});

export const carpoolExplanationOutputSchema = z.object({
  compatibility_summary: z.string(),
  advantages: z.array(z.string()),
  limitations: z.array(z.string()),
  consent_required: z.literal(true)
});

export const complaintDraftOutputSchema = z.object({
  subject: z.string(),
  complaint_body: z.string(),
  facts_used: z.array(z.string()),
  unverified_claims: z.array(z.string()),
  requires_user_approval: z.literal(true)
});

export const naturalLanguageIntentOutputSchema = z.object({
  pickup: z.string().nullable(),
  destination: z.string().nullable(),
  maximum_budget: z.number(),
  preferred_modes: z.array(z.string()),
  departure_preference: z.string().nullable(),
  missing_information: z.array(z.string())
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format (UUID expected)')
});
