#import "WindowAppearanceModule.h"
#import <AppKit/AppKit.h>

@implementation WindowAppearanceModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setDarkMode:(BOOL)isDark)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSWindow *window = [NSApplication sharedApplication].mainWindow;
    if (!window) {
      window = [NSApplication sharedApplication].windows.firstObject;
    }
    if (!window) return;

    window.titlebarAppearsTransparent = YES;
    window.titleVisibility = NSWindowTitleHidden;

    if (isDark) {
      window.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
      // Matches AppDarkTheme background: "#0d0d0d"
      window.backgroundColor = [NSColor colorWithRed:0.051 green:0.051 blue:0.051 alpha:1.0];
    } else {
      window.appearance = [NSAppearance appearanceNamed:NSAppearanceNameAqua];
      // Matches AppLightTheme background: "#ffffff"
      window.backgroundColor = [NSColor whiteColor];
    }
  });
}

@end
