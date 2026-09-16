import { z } from 'zod';
export const TierSchema = z.enum(['free', 'premium']);
export const StatusCodeSchema = z.number().int().min(400).max(599);
export const DelaySchema = z.number().int().min(0).max(60000);
export const ActionSchema = z.enum([
  'respond',
  'error',
  'success',
  'http-error',
  'malformed',
  'timeout',
  'network-failure',
]);
const FreeFixtureSchema = z
  .object({
    cin: z.string().min(1),
    name: z.string().min(1),
    registration_date: z.string().date(),
    address: z.string().min(1),
    is_active: z.boolean(),
  })
  .strict();
const PremiumFixtureSchema = z
  .object({
    companyIdentificationNumber: z.string().min(1),
    companyName: z.string().min(1),
    registrationDate: z.string().date(),
    fullAddress: z.string().min(1),
    isActive: z.boolean(),
  })
  .strict();
export const FixtureRecordSchema = z.union([FreeFixtureSchema, PremiumFixtureSchema]);
export const MatchRuleSchema = z
  .object({
    order: z.number().int().nonnegative(),
    query: z.string().trim().min(1),
    action: ActionSchema,
    statusCode: StatusCodeSchema.optional(),
    delayMs: DelaySchema.default(0),
  })
  .strict()
  .superRefine((r, c) => {
    if ((r.action === 'error' || r.action === 'http-error') && r.statusCode === undefined)
      c.addIssue({
        code: 'custom',
        path: ['statusCode'],
        message: 'is required for http-error action',
      });
    if (r.action !== 'error' && r.action !== 'http-error' && r.statusCode !== undefined)
      c.addIssue({
        code: 'custom',
        path: ['statusCode'],
        message: 'is only valid for http-error action',
      });
  });
const ActionSpecSchema = z
  .object({
    action: ActionSchema,
    statusCode: StatusCodeSchema.optional(),
    delayMs: DelaySchema.default(0),
  })
  .strict()
  .superRefine((r, c) => {
    if ((r.action === 'error' || r.action === 'http-error') && r.statusCode === undefined)
      c.addIssue({
        code: 'custom',
        path: ['statusCode'],
        message: 'is required for http-error action',
      });
    if (r.action !== 'error' && r.action !== 'http-error' && r.statusCode !== undefined)
      c.addIssue({
        code: 'custom',
        path: ['statusCode'],
        message: 'is only valid for http-error action',
      });
  });
export const ActionSequenceSchema = z
  .object({ name: z.string().min(1), actions: z.array(ActionSpecSchema).min(1) })
  .strict();
export const ScheduleSchema = z
  .object({
    rules: z.array(MatchRuleSchema).superRefine((rs, c) => {
      const seen = new Set<number>();
      rs.forEach((r, i) => {
        if (seen.has(r.order))
          c.addIssue({ code: 'custom', path: [i, 'order'], message: 'duplicate rule ordering' });
        seen.add(r.order);
      });
    }),
    sequences: z.array(ActionSequenceSchema),
    defaultSequence: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((schedule, context) => {
    if (
      schedule.defaultSequence !== undefined &&
      !schedule.sequences.some((sequence) => sequence.name === schedule.defaultSequence)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['defaultSequence'],
        message: 'must reference a configured sequence',
      });
    }
  });
const FreeConfigurationSchema = z
  .object({
    tier: z.literal('free'),
    fixtures: z.array(FreeFixtureSchema).min(1),
    schedule: ScheduleSchema,
  })
  .strict();
const PremiumConfigurationSchema = z
  .object({
    tier: z.literal('premium'),
    fixtures: z.array(PremiumFixtureSchema).min(1),
    schedule: ScheduleSchema,
  })
  .strict();
export const ConfigurationSchema = z.discriminatedUnion('tier', [
  FreeConfigurationSchema,
  PremiumConfigurationSchema,
]);
export type Configuration = Readonly<{
  tier: z.infer<typeof TierSchema>;
  fixtures: z.infer<typeof FixtureRecordSchema>[];
  schedule: z.infer<typeof ScheduleSchema>;
}>;
export function validateConfiguration(input: unknown): Configuration {
  const r = ConfigurationSchema.safeParse(input);
  if (!r.success)
    throw new Error(
      r.error.issues.map((i) => `${i.path.join('.') || 'configuration'}: ${i.message}`).join('; ')
    );
  return freeze(r.data) as Configuration;
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(freeze);
  }
  return v;
}
