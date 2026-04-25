// Stub: makes Skia's renderHelpers see version=undefined → HAS_REANIMATED_3=false
// → Skia uses StaticContainer (no worklets needed).
// Must export {} instead of throwing — ReanimatedProxy re-throws errors as
// "react-native-reanimated is not installed!" if require() fails.
module.exports = {}
