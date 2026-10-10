"""Switch the generated Flutter Android project from debug signing to the release key.

CI regenerates the Gradle files with `flutter create` on every build, so the release
signing config is patched in here instead of being committed. Expects
flutter_app/android/key.properties to have been written from repository secrets.
"""
import pathlib
import sys

app = pathlib.Path("flutter_app/android/app")
kts = app / "build.gradle.kts"
groovy = app / "build.gradle"

if kts.exists():
    path = kts
    signing_block = """    signingConfigs {
        create("release") {
            val props = Properties()
            val propsFile = rootProject.file("key.properties")
            if (propsFile.exists()) propsFile.inputStream().use { props.load(it) }
            keyAlias = props.getProperty("keyAlias")
            keyPassword = props.getProperty("keyPassword")
            storeFile = props.getProperty("storeFile")?.let { file(it) }
            storePassword = props.getProperty("storePassword")
        }
    }

"""
    debug_line = 'signingConfig = signingConfigs.getByName("debug")'
    release_line = 'signingConfig = signingConfigs.getByName("release")'
elif groovy.exists():
    path = groovy
    signing_block = """    signingConfigs {
        release {
            def props = new Properties()
            def propsFile = rootProject.file("key.properties")
            if (propsFile.exists()) propsFile.withInputStream { props.load(it) }
            keyAlias props["keyAlias"]
            keyPassword props["keyPassword"]
            storeFile props["storeFile"] ? file(props["storeFile"]) : null
            storePassword props["storePassword"]
        }
    }

"""
    debug_line = "signingConfig signingConfigs.debug"
    release_line = "signingConfig signingConfigs.release"
else:
    sys.exit("No app/build.gradle(.kts) found - did the scaffold step run?")

src = path.read_text()
if "buildTypes {" not in src or debug_line not in src:
    sys.exit(f"Unexpected template in {path}; update apply_release_signing.py")

src = src.replace("    buildTypes {", signing_block + "    buildTypes {", 1)
src = src.replace(debug_line, release_line)
if path == kts and "import java.util.Properties" not in src:
    # Inside android { } the name `java` resolves to Gradle's java extension,
    # so java.util.Properties must be imported at the top of the script
    src = "import java.util.Properties\n\n" + src
path.write_text(src)
print(f"Release signing applied to {path}")
