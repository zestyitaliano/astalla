import type { z } from "zod";

import {
  featureFlagScopeSchema,
  featureFlagStateSchema,
  updateFeatureFlagRequestSchema,
} from "../schemas";

export type FeatureFlagScope = z.infer<typeof featureFlagScopeSchema>;
export type FeatureFlagState = z.infer<typeof featureFlagStateSchema>;
export type UpdateFeatureFlagRequest = z.infer<typeof updateFeatureFlagRequestSchema>;
