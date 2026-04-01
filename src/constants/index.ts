// API
export const API_BASE_URL = "https://api.racetelemetrybyfbt.com";

// LMU Bridge local API (game REST API on port 6397)
export const LMU_API_BASE_URL = "http://localhost:6397";

// VPS Proxy endpoints for CORS-safe access to bridge endpoints
export const VPS_BRIDGE_SETUPS_LIST = "/api/bridge/setups/list";
export const VPS_BRIDGE_SETUPS_APPLY = "/api/bridge/setups/apply";

// Setup bridge REST - Real LMU endpoints
export const SETUPS_LIST_ENDPOINT = "/rest/garage/setups";
export const SETUPS_LOAD_ENDPOINT = "/rest/garage/setups/apply";

// Fallback endpoints to try in order
export const SETUPS_LIST_ENDPOINTS = [
	"/rest/garage/setups",
	"/api/setups",
	"/api/setup-bridge/setups",
	"/api/garage/setups",
	"/setups"
];

export const SETUPS_LOAD_ENDPOINTS = [
	"/rest/garage/setups/apply",
	"/api/setups/load",
	"/api/setup-bridge/load",
	"/api/setups/apply",
	"/rest/garage/setups/load"
];

// Pit stop timing (seconds)
export const PIT_LANE_LOSS = 28;
export const DEFAULT_STATIONARY_TIME = 35;

// Strategy defaults
export const DEFAULT_LAP_TIME = 210;
export const MAX_STINTS_LOOKAHEAD = 20;

// Fuel estimation (LiveTimingView)
export const MAX_LAPS_HYPERCAR = 13;
export const MAX_LAPS_DEFAULT = 12;

// Map
export const MAP_PADDING = 0.15;
export const MAP_MIN_POINTS_LOADED = 50;
export const MAP_MIN_DISTANCE_BETWEEN_POINTS = 5;
export const MAP_AUTO_CLOSE_THRESHOLD = 40;
export const MAP_MIN_POINTS_FOR_LOOP = 200;
