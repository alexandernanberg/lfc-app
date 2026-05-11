import ExpoModulesCore
import SwiftUI

enum SFSymbolRenderingMode: String, Enumerable {
  case hierarchical
  case palette
  case multicolor
  case monochrome

  func toSFSymbolRenderingMode() -> SymbolRenderingMode {
    switch self {
    case .hierarchical: return .hierarchical
    case .monochrome: return .monochrome
    case .multicolor: return .multicolor
    case .palette: return .palette
    }
  }
}

enum SFSymbolScale: String, Enumerable {
  case small
  case medium
  case large

  func toImageScale() -> Image.Scale {
    switch self {
    case .small: return .small
    case .medium: return .medium
    case .large: return .large
    }
  }
}

enum SFSymbolWeight: String, Enumerable {
  case ultraLight
  case thin
  case light
  case regular
  case medium
  case semibold
  case bold
  case heavy
  case black

  func toFontWeight() -> Font.Weight {
    switch self {
    case .ultraLight: return .ultraLight
    case .thin: return .thin
    case .light: return .light
    case .regular: return .regular
    case .medium: return .medium
    case .semibold: return .semibold
    case .bold: return .bold
    case .heavy: return .heavy
    case .black: return .black
    }
  }
}
