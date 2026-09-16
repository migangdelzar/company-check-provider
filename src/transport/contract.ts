import { z } from "zod";

export const FreeCompanyContract = z.object({
  cin: z.string(),
  name: z.string(),
  registration_date: z.string().date(),
  address: z.string(),
  is_active: z.boolean(),
}).strict();

export const PremiumCompanyContract = z.object({
  companyIdentificationNumber: z.string(),
  companyName: z.string(),
  registrationDate: z.string().date(),
  fullAddress: z.string(),
  isActive: z.boolean(),
}).strict();

export const lookupContract = z.array(z.union([FreeCompanyContract, PremiumCompanyContract]));

export type FreeCompanyContract = z.infer<typeof FreeCompanyContract>;
export type PremiumCompanyContract = z.infer<typeof PremiumCompanyContract>;
