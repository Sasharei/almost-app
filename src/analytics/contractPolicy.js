const ANALYTICS_SCHEMA_VERSION = "2";

const DESTINATIONS = Object.freeze({
  GA4: "ga4",
  AMPLITUDE: "amplitude",
  APPSFLYER: "appsflyer",
  META: "meta",
  TIKTOK: "tiktok",
});

const PRODUCT_DESTINATIONS = Object.freeze([
  DESTINATIONS.GA4,
  DESTINATIONS.AMPLITUDE,
]);

const GLOBAL_PARAM_TYPES = Object.freeze({
  analytics_schema_version: "string",
  app_version: "string",
  build_number: "string",
  platform: "string",
  experiment_id: "string",
  experiment_variant: "string",
  install_id_present: "boolean",
});

const GLOBAL_PARAM_NAMES = Object.freeze(Object.keys(GLOBAL_PARAM_TYPES));

const EVENT_OVERRIDES = Object.freeze({
  analytics_contract_error: {
    required_params: ["error_type", "count_bucket"],
    param_types: {
      error_type: "string",
      count_bucket: "string",
    },
  },
  attribution_sync_result: {
    required_params: [
      "provider",
      "result",
      "elapsed_bucket",
      "has_provider_id",
      "has_campaign_fields",
      "attempt",
      "app_version",
    ],
    param_types: {
      provider: "string",
      result: "string",
      elapsed_bucket: "string",
      has_provider_id: "boolean",
      has_campaign_fields: "boolean",
      attempt: "number",
      app_version: "string",
    },
  },
  onboarding_completed: {
    destinations: [...PRODUCT_DESTINATIONS, DESTINATIONS.APPSFLYER],
    required_params: ["persona_id", "goal_id", "has_goal", "start_balance", "skipped"],
    appsflyer_params: ["has_goal", "skipped"],
  },
  north_star_two_saves: {
    destinations: [...PRODUCT_DESTINATIONS, DESTINATIONS.APPSFLYER],
    required_params: ["saves_in_window", "hours_since_join"],
    appsflyer_params: ["saves_in_window", "hours_since_join"],
  },
  retention_3_sessions_7_days: {
    destinations: [...PRODUCT_DESTINATIONS, DESTINATIONS.APPSFLYER],
    required_params: ["sessions_in_7_days", "lifetime_day", "active_days_total"],
    appsflyer_params: ["sessions_in_7_days", "lifetime_day", "active_days_total"],
  },
  premium_paywall_shown: {
    destinations: [...PRODUCT_DESTINATIONS, DESTINATIONS.APPSFLYER],
    required_params: ["kind", "feature", "trigger", "view_index"],
    appsflyer_params: ["kind", "feature", "trigger", "view_index"],
  },
  premium_paywall_primary_tapped: {
    destinations: [...PRODUCT_DESTINATIONS, DESTINATIONS.APPSFLYER],
    required_params: ["kind", "feature", "plan", "view_index", "product_id", "has_trial"],
    appsflyer_params: ["kind", "feature", "view_index"],
  },
  premium_purchase_result: {
    required_params: [
      "result",
      "period_type",
      "product_id",
      "offering_id",
      "error_category",
      "is_restore",
    ],
    param_types: {
      result: "string",
      period_type: "string",
      product_id: "string",
      offering_id: "string",
      error_category: "string",
      is_restore: "boolean",
    },
  },
  premium_entitlement_activated: {
    required_params: [
      "billing_state",
      "period_type",
      "product_id",
      "offering_id",
      "is_restore",
    ],
    param_types: {
      billing_state: "string",
      period_type: "string",
      product_id: "string",
      offering_id: "string",
      is_restore: "boolean",
    },
  },
  premium_trial_started: {
    required_params: ["plan", "product_id", "source", "period_type"],
  },
  retention_day_milestone: {
    required_params: ["day", "active_days_total", "active_streak"],
  },
  level_reached: {
    required_params: ["level"],
  },
  language_selected: {
    required_params: ["language"],
  },
  currency_selected: {
    required_params: ["currency"],
  },
  persona_selected: {
    required_params: ["persona_id"],
  },
  gender_selected: {
    required_params: ["gender"],
  },
  daily_reward_claimed: {
    required_params: ["day", "coins", "level"],
  },
  setting_changed: {
    required_params: ["setting", "enabled", "source"],
    param_types: {
      setting: "string",
      enabled: "boolean",
      source: "string",
    },
  },
  tamagotchi_opened: {
    required_params: ["source"],
  },
  app_screen_viewed: {
    destinations: [DESTINATIONS.AMPLITUDE],
    required_params: ["screen_id", "source"],
  },
});

const CLIENT_SUBSCRIPTION_EVENT_NAMES = Object.freeze([
  "premium_trial_started",
  "premium_entitlement_activated",
  "premium_purchase_result",
  "premium_trial_cancelled",
  "premium_trial_converted",
  "premium_renewal",
  "premium_cancellation",
  "premium_non_subscription_purchase",
  "premium_expiration",
  "premium_billing_issue",
  "premium_product_change",
  "premium_conversion",
]);

const AD_DESTINATIONS = new Set([
  DESTINATIONS.APPSFLYER,
  DESTINATIONS.META,
  DESTINATIONS.TIKTOK,
]);

const inferParamType = (paramName) => {
  const normalized = String(paramName || "").trim().toLowerCase();
  if (!normalized) return ["string", "number", "boolean"];
  if (normalized === "categories" || normalized === "items") {
    return ["array", "string"];
  }
  if (
    normalized === "enabled" ||
    normalized === "success" ||
    normalized === "skipped" ||
    normalized === "missed" ||
    normalized.startsWith("is_") ||
    normalized.startsWith("has_") ||
    normalized.startsWith("had_") ||
    normalized.startsWith("will_")
  ) {
    return ["boolean", "number"];
  }
  if (
    normalized.endsWith("_id") ||
    normalized.endsWith("_key") ||
    normalized.endsWith("_type") ||
    normalized.endsWith("_source") ||
    normalized.endsWith("_status") ||
    normalized.endsWith("_currency") ||
    normalized === "currency" ||
    normalized === "platform" ||
    normalized === "plan" ||
    normalized === "result" ||
    normalized === "reason" ||
    normalized === "source" ||
    normalized === "action"
  ) {
    return "string";
  }
  if (
    normalized.includes("count") ||
    normalized.includes("amount") ||
    normalized.includes("price") ||
    normalized.includes("total") ||
    normalized.includes("level") ||
    normalized.includes("index") ||
    normalized.includes("percent") ||
    normalized.includes("duration") ||
    normalized.includes("days") ||
    normalized.includes("hours") ||
    normalized.includes("streak") ||
    normalized.endsWith("_ms") ||
    normalized.endsWith("_sec") ||
    normalized.endsWith("_usd") ||
    normalized.endsWith("_local")
  ) {
    return "number";
  }
  return ["string", "number", "boolean"];
};

const normalizeTypeList = (value) => (Array.isArray(value) ? value : [value]);

const matchesType = (value, declaredType) =>
  normalizeTypeList(declaredType).some((typeName) => {
    if (typeName === "array") return Array.isArray(value);
    if (typeName === "number") return typeof value === "number" && Number.isFinite(value);
    return typeof value === typeName;
  });

const buildEventContract = (eventParamAllowlists = {}) => {
  const entries = Object.entries(eventParamAllowlists).map(([eventName, params]) => {
    const override = EVENT_OVERRIDES[eventName] || {};
    const eventParams = Array.isArray(params) ? params : [];
    const requiredEventParams = Array.isArray(override.required_params)
      ? override.required_params
      : [];
    const allEventParams = Array.from(new Set([...eventParams, ...requiredEventParams]));
    const paramTypes = {
      ...GLOBAL_PARAM_TYPES,
      ...Object.fromEntries(allEventParams.map((paramName) => [paramName, inferParamType(paramName)])),
      ...(override.param_types || {}),
    };
    const requiredParams = Array.from(new Set([...GLOBAL_PARAM_NAMES, ...requiredEventParams]));
    const optionalParams = Array.from(
      new Set(allEventParams.filter((paramName) => !requiredEventParams.includes(paramName)))
    );
    const allContractParams = Array.from(
      new Set([...requiredParams, ...optionalParams])
    );
    const destinations = [
      ...(override.destinations || PRODUCT_DESTINATIONS),
    ];
    const destinationParams = Object.fromEntries(
      destinations.map((destination) => [
        destination,
        Object.freeze(
          destination === DESTINATIONS.APPSFLYER
            ? Array.from(
                new Set([
                  ...GLOBAL_PARAM_NAMES,
                  ...(override.appsflyer_params || []),
                ])
              )
            : allContractParams
        ),
      ])
    );
    return [
      eventName,
      Object.freeze({
        destinations: Object.freeze(destinations),
        destination_params: Object.freeze(destinationParams),
        required_params: Object.freeze(requiredParams),
        optional_params: Object.freeze(optionalParams),
        param_types: Object.freeze(paramTypes),
        schema_version: ANALYTICS_SCHEMA_VERSION,
      }),
    ];
  });
  return Object.freeze(Object.fromEntries(entries));
};

const validateEventAgainstContract = (eventName, params, eventContract) => {
  const contract = eventContract?.[eventName];
  if (!contract) {
    return { ok: false, errorType: "unknown_event" };
  }
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return { ok: false, errorType: "invalid_params_container" };
  }
  for (const paramName of contract.required_params) {
    if (params[paramName] === undefined || params[paramName] === null) {
      return { ok: false, errorType: "missing_required_param", paramName };
    }
  }
  const allowedParams = new Set([
    ...contract.required_params,
    ...contract.optional_params,
  ]);
  for (const [paramName, value] of Object.entries(params)) {
    if (!allowedParams.has(paramName) || value === undefined || value === null) continue;
    if (!matchesType(value, contract.param_types[paramName])) {
      return { ok: false, errorType: "invalid_param_type", paramName };
    }
  }
  return { ok: true, contract };
};

const filterContractParams = (params, contract) => {
  const allowedParams = new Set([
    ...contract.required_params,
    ...contract.optional_params,
  ]);
  return Object.entries(params || {}).reduce((result, [key, value]) => {
    if (!allowedParams.has(key) || value === undefined || value === null) return result;
    result[key] = value;
    return result;
  }, {});
};

const filterDestinationParams = (params, contract, destination) => {
  const allowedParams = new Set(contract?.destination_params?.[destination] || []);
  return Object.entries(params || {}).reduce((result, [key, value]) => {
    if (!allowedParams.has(key) || value === undefined || value === null) return result;
    result[key] = value;
    return result;
  }, {});
};

const assertDefaultDenyRouting = (eventContract) => {
  Object.entries(eventContract || {}).forEach(([eventName, contract]) => {
    const destinations = Array.isArray(contract?.destinations) ? contract.destinations : [];
    if (destinations.includes(DESTINATIONS.META) || destinations.includes(DESTINATIONS.TIKTOK)) {
      throw new Error(`Client network route is forbidden for ${eventName}`);
    }
    if (
      CLIENT_SUBSCRIPTION_EVENT_NAMES.includes(eventName) &&
      destinations.some((destination) => AD_DESTINATIONS.has(destination))
    ) {
      throw new Error(`Client subscription route is forbidden for ${eventName}`);
    }
  });
  return true;
};

module.exports = {
  AD_DESTINATIONS,
  ANALYTICS_SCHEMA_VERSION,
  CLIENT_SUBSCRIPTION_EVENT_NAMES,
  DESTINATIONS,
  EVENT_OVERRIDES,
  GLOBAL_PARAM_NAMES,
  GLOBAL_PARAM_TYPES,
  PRODUCT_DESTINATIONS,
  assertDefaultDenyRouting,
  buildEventContract,
  filterContractParams,
  filterDestinationParams,
  inferParamType,
  matchesType,
  validateEventAgainstContract,
};
