/**
 * Height of the native bottom tab bar (createNativeBottomTabNavigator).
 *
 * The native tabs don't expose their height (useBottomTabBarHeight only works
 * with the JS tab bar), so lists that scroll edge-to-edge under it need to
 * reserve this much space at the bottom. Combine with the bottom safe-area
 * inset for the total clearance.
 */
export const TAB_BAR_HEIGHT = 49
