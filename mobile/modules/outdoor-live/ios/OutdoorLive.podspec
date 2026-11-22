Pod::Spec.new do |s|
  s.name           = 'OutdoorLive'
  s.version        = '1.0.0'
  s.summary        = 'FitGen outdoor Live Activities'
  s.homepage       = 'https://fitgen.pro'
  s.license        = { :type => 'MIT' }
  s.author         = 'FitGen'
  s.source         = { :path => '.' }
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
end
