const fs = require('node:fs');
const path = require('node:path');
const { withXcodeProject } = require('expo/config-plugins');

const targetName = 'FitGenOutdoorWidget';
const sources = ['OutdoorActivityAttributes.swift', 'FitGenOutdoorWidget.swift'];

module.exports = function withOutdoorLive(config) {
  const bundleIdentifier = `${config.ios.bundleIdentifier}.outdoor-live`;
  config.extra.eas.build ??= {};
  config.extra.eas.build.experimental ??= {};
  config.extra.eas.build.experimental.ios ??= {};
  const credentials = config.extra.eas.build.experimental.ios;
  credentials.appExtensions ??= [];
  if (!credentials.appExtensions.some((extension) => extension.targetName === targetName)) {
    credentials.appExtensions.push({ targetName, bundleIdentifier });
  }

  return withXcodeProject(config, (mod) => {
    const root = mod.modRequest.platformProjectRoot;
    const moduleRoot = path.join(mod.modRequest.projectRoot, 'modules', 'outdoor-live');
    const targetRoot = path.join(root, targetName);
    fs.mkdirSync(targetRoot, { recursive: true });
    fs.copyFileSync(path.join(moduleRoot, 'ios', sources[0]), path.join(targetRoot, sources[0]));
    fs.copyFileSync(path.join(moduleRoot, 'widget', sources[1]), path.join(targetRoot, sources[1]));

    const plistPath = path.join(targetRoot, 'Info.plist');
    if (!fs.existsSync(plistPath)) {
      // Preserve the plist when EAS has already injected a remote build number.
      fs.copyFileSync(path.join(moduleRoot, 'widget', 'Info.plist'), plistPath);
    }

    const project = mod.modResults;
    const objects = project.hash.project.objects;
    const host = project.getFirstTarget();
    let extension = project.pbxTargetByName(targetName);
    if (!extension) {
      objects.PBXTargetDependency ??= {};
      objects.PBXContainerItemProxy ??= {};
      const target = project.addTarget(targetName, 'app_extension', targetName, bundleIdentifier);
      extension = target.pbxNativeTarget;
      const sourceFiles = sources.map((file) => `${targetName}/${file}`);
      project.addBuildPhase(sourceFiles, 'PBXSourcesBuildPhase', 'Sources', target.uuid);
      const group = project.addPbxGroup([...sourceFiles, `${targetName}/Info.plist`], targetName, '""');
      objects.PBXGroup[project.getFirstProject().firstProject.mainGroup].children.push({
        value: group.uuid,
        comment: targetName,
      });

      const embed = host.firstTarget.buildPhases.find(({ value }) =>
        objects.PBXCopyFilesBuildPhase[value]?.files.some(({ value: file }) =>
          objects.PBXBuildFile[file].fileRef === extension.productReference));
      objects.PBXCopyFilesBuildPhase[embed.value].name = '"Embed App Extensions"';
    }

    const configurations = objects.XCConfigurationList[extension.buildConfigurationList].buildConfigurations;
    const hostConfigurations = objects.XCConfigurationList[host.firstTarget.buildConfigurationList].buildConfigurations;
    for (const { value } of configurations) {
      const build = objects.XCBuildConfiguration[value];
      const hostBuild = hostConfigurations
        .map(({ value: key }) => objects.XCBuildConfiguration[key])
        .find(({ name }) => name === build.name).buildSettings;

      Object.assign(build.buildSettings, {
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: mod.ios.buildNumber ?? '1',
        DEVELOPMENT_TEAM: mod.ios.appleTeamId ?? hostBuild.DEVELOPMENT_TEAM ?? '""',
        GENERATE_INFOPLIST_FILE: 'YES',
        INFOPLIST_FILE: `${targetName}/Info.plist`,
        IPHONEOS_DEPLOYMENT_TARGET: '16.4',
        MARKETING_VERSION: mod.version,
        PRODUCT_BUNDLE_IDENTIFIER: bundleIdentifier,
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: hostBuild.TARGETED_DEVICE_FAMILY ?? '1',
      });
    }
    return mod;
  });
};
