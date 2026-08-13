import ExpoModulesCore
import SwiftUI

class Props: ObservableObject {
  @Published var name: String = ""
  @Published var weight: SFSymbolWeight = .regular
  @Published var scale: SFSymbolScale = .medium
  @Published var size: Double = 0
  @Published var colors: [UIColor] = []
  @Published var renderingMode: SFSymbolRenderingMode = .monochrome
}

struct SFSymbolSwiftUIView: View {
  @ObservedObject var props: Props

  var body: some View {
    Image(systemName: props.name)
      .imageScale(props.scale.toImageScale())
      .font(.system(size: props.size, weight: props.weight.toFontWeight()))
      .applyColors(props.colors)
      .symbolRenderingMode(props.renderingMode.toSFSymbolRenderingMode())
  }
}

private extension View {
  @ViewBuilder
  func applyColors(_ colors: [UIColor]) -> some View {
    switch colors.count {
    case 1: self.foregroundStyle(Color(colors[0]))
    case 2: self.foregroundStyle(Color(colors[0]), Color(colors[1]))
    case 3: self.foregroundStyle(Color(colors[0]), Color(colors[1]), Color(colors[2]))
    default: self
    }
  }
}

class SFSymbolsView: ExpoView {
  let props = Props()

  required init(appContext: AppContext? = nil) {
    let hostingController = UIHostingController(rootView: SFSymbolSwiftUIView(props: props))

    super.init(appContext: appContext)

    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    hostingController.view.backgroundColor = .clear

    addSubview(hostingController.view)
    NSLayoutConstraint.activate([
      hostingController.view.topAnchor.constraint(equalTo: self.topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: self.bottomAnchor),
      hostingController.view.leftAnchor.constraint(equalTo: self.leftAnchor),
      hostingController.view.rightAnchor.constraint(equalTo: self.rightAnchor),
    ])
  }
}
