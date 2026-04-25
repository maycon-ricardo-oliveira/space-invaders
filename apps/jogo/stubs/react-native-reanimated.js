// Stub: forces HAS_REANIMATED_3 = false in @shopify/react-native-skia,
// making Skia use StaticContainer instead of NativeReanimatedContainer.
// Safe: the game uses no Reanimated Skia APIs (no useSharedValue, no withTiming, etc).
throw new Error('react-native-reanimated stubbed out')
