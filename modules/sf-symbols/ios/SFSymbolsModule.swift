import ExpoModulesCore

public class SFSymbolsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SFSymbols")

    View(SFSymbolsView.self) {
      Prop("name") { (view: SFSymbolsView, name: String?) in
        view.props.name = name ?? ""
      }
      Prop("weight") { (view: SFSymbolsView, weight: SFSymbolWeight?) in
        view.props.weight = weight ?? .regular
      }
      Prop("scale") { (view: SFSymbolsView, scale: SFSymbolScale?) in
        view.props.scale = scale ?? .medium
      }
      Prop("size") { (view: SFSymbolsView, size: Double?) in
        view.props.size = size ?? 17.0
      }
      Prop("colors") { (view: SFSymbolsView, colors: [UIColor]?) in
        view.props.colors = colors ?? [UIColor.black]
      }
      Prop("renderingMode") { (view: SFSymbolsView, mode: SFSymbolRenderingMode?) in
        view.props.renderingMode = mode ?? .monochrome
      }
    }
  }
}
