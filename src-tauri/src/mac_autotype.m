#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>
#import <stdlib.h>

// Check whether Accessibility is enabled for this process
bool is_accessibility_enabled() {
    return AXIsProcessTrusted();
}

// Request accessibility by prompting the user
void request_accessibility() {
    NSLog(@"[request_accessibility] Starting accessibility permission request");
    
    // Dispatch to main thread to ensure proper UI handling
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"[request_accessibility] Executing on main thread");
        
        CFStringRef keys[] = { kAXTrustedCheckOptionPrompt };
        CFBooleanRef values[] = { kCFBooleanTrue };
        CFDictionaryRef options = CFDictionaryCreate(NULL, (const void**)keys, (const void**)values, 1,
                                                     &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
        
        NSLog(@"[request_accessibility] Calling AXIsProcessTrustedWithOptions");
        BOOL result = AXIsProcessTrustedWithOptions(options);
        NSLog(@"[request_accessibility] Result: %d", result);
        
        if (options) CFRelease(options);
        
        NSLog(@"[request_accessibility] Completed");
    });
}

static CGEventFlags flags_from_mask(int modifiers) {
    CGEventFlags flags = 0;
    if (modifiers & 1) flags |= kCGEventFlagMaskShift;
    if (modifiers & 2) flags |= kCGEventFlagMaskControl;
    if (modifiers & 4) flags |= kCGEventFlagMaskAlternate;
    if (modifiers & 8) flags |= kCGEventFlagMaskCommand;
    return flags;
}

static NSString *frontmost_window_title(void) {
    NSString *title = nil;
    CFArrayRef windowList = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
                                                       kCGNullWindowID);
    if (!windowList) {
        return nil;
    }

    CFIndex count = CFArrayGetCount(windowList);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef window = (CFDictionaryRef)CFArrayGetValueAtIndex(windowList, i);
        NSNumber *layer = CFDictionaryGetValue(window, kCGWindowLayer);
        if (layer && layer.intValue != 0) {
            continue;
        }

        NSString *candidateTitle = CFDictionaryGetValue(window, kCGWindowName);
        NSString *owner = CFDictionaryGetValue(window, kCGWindowOwnerName);

        if ([candidateTitle isEqualToString:@"StatusIndicator"] && [owner isEqualToString:@"Window Server"]) {
            continue;
        }

        if (candidateTitle.length > 0) {
            title = [candidateTitle copy];
            break;
        }
    }

    CFRelease(windowList);
    return title;
}

// Send text natively using Unicode keyboard events.
int send_text(const char* seq) {
    @autoreleasepool {
        if (!seq) return 1;
        NSString *s = [NSString stringWithUTF8String:seq];
        if (!s) return 2;

        NSUInteger length = [s length];
        if (length == 0) return 0;

        UniChar buffer[length];
        [s getCharacters:buffer range:NSMakeRange(0, length)];

        CGEventRef keyDown = CGEventCreateKeyboardEvent(NULL, 0, true);
        if (!keyDown) return 3;
        CGEventKeyboardSetUnicodeString(keyDown, length, buffer);
        CGEventPost(kCGHIDEventTap, keyDown);
        CFRelease(keyDown);

        return 0;
    }
}

int send_keycode_with_modifiers(int code, int modifiers) {
    @autoreleasepool {
        CGKeyCode key = (CGKeyCode)code;
        CGEventFlags flags = flags_from_mask(modifiers);

        CGEventRef keyDown = CGEventCreateKeyboardEvent(NULL, key, true);
        if (!keyDown) return 1;
        CGEventSetFlags(keyDown, flags);
        CGEventPost(kCGHIDEventTap, keyDown);
        CFRelease(keyDown);

        CGEventRef keyUp = CGEventCreateKeyboardEvent(NULL, key, false);
        if (!keyUp) return 2;
        CGEventSetFlags(keyUp, flags);
        CGEventPost(kCGHIDEventTap, keyUp);
        CFRelease(keyUp);

        return 0;
    }
}

// Send a raw keycode (without modifiers). Returns 0 on success.
int send_keycode(int code) {
    return send_keycode_with_modifiers(code, 0);
}

// Clear clipboard either immediately or after a delay (seconds). Returns 0 on success.
int clear_clipboard_after(int seconds) {
    @autoreleasepool {
        if (seconds <= 0) {
            NSPasteboard *pb = [NSPasteboard generalPasteboard];
            [pb clearContents];
            return 0;
        }

        dispatch_time_t when = dispatch_time(DISPATCH_TIME_NOW, (int64_t)seconds * NSEC_PER_SEC);
        dispatch_after(when, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            @autoreleasepool {
                NSPasteboard *pb = [NSPasteboard generalPasteboard];
                [pb clearContents];
            }
        });

        return 0;
    }
}

bool is_screen_recording_enabled(void) {
    if (@available(macOS 10.15, *)) {
        return CGPreflightScreenCaptureAccess();
    }
    return true;
}

void request_screen_recording(void) {
    if (@available(macOS 10.15, *)) {
        CGRequestScreenCaptureAccess();
    }
}

const char *get_frontmost_window_title(void) {
    @autoreleasepool {
        NSString *title = frontmost_window_title();
        if (!title) {
            return strdup("");
        }

        const char *utf8 = [title UTF8String];
        char *copy = utf8 ? strdup(utf8) : strdup("");
        return copy;
    }
}

void free_c_string(const char *value) {
    if (value) {
        free((void *)value);
    }
}
