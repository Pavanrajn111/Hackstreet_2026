export const getRecommendationMetrics = (recommendation) => ({
  irrigationDepthMm: recommendation?.irrigation_depth_mm ?? 0,
  waterVolumeLitres: recommendation?.water_volume_litres ?? 0,
  runtimeMinutes: recommendation?.estimated_pump_runtime_minutes ?? 0,
  waterSavings: recommendation?.water_savings || null,
});

export default { getRecommendationMetrics };
