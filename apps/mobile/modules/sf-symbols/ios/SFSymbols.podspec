require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SFSymbols'
  s.version        = package['version']
  s.summary        = 'Local SF Symbols module'
  s.description    = 'Local Expo module wrapping SwiftUI Image(systemName:) for rendering SF Symbols.'
  s.license        = 'MIT'
  s.author         = 'lfc-app'
  s.homepage       = 'https://github.com/alexandernanberg/lfc-app'
  s.platform       = :ios, '16.4'
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/alexandernanberg/lfc-app.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
