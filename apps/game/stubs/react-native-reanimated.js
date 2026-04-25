// Stub for @shopify/react-native-skia 2.x — keeps HAS_REANIMATED_3=false.
//
// renderHelpers.ts checks require("react-native-reanimated/package.json").version.
// Metro intercepts that path here too (startsWith check), returns {}, version=undefined
// → HAS_REANIMATED_3 stays false → Skia uses StaticContainer. Safe.
//
// useVideoLoading.js calls createWorkletRuntime() at module-load time (top-level),
// so it must be a real function even when HAS_REANIMATED_3=false.
// All other Rea.* calls are only reached when HAS_REANIMATED_3=true, but
// we stub them anyway to avoid any future surprises.
const noop = () => {}
const identity = (fn) => fn
const sharedValue = (v) => ({ value: v })

module.exports = {
  createWorkletRuntime: () => ({}),
  runOnRuntime: () => noop,
  runOnUI: () => noop,
  runOnJS: identity,
  isSharedValue: () => false,
  makeMutable: sharedValue,
  startMapper: () => 0,
  stopMapper: noop,
  useSharedValue: sharedValue,
  useDerivedValue: () => sharedValue(undefined),
  useAnimatedReaction: noop,
  useFrameCallback: noop,
}
