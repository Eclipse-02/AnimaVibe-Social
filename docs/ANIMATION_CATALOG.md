| Nama Animasi | Screen | Library | Hook / API | Gesture Trigger |
|--------------|--------|---------|------------|-----------------|
| Post Options Dropdown | PostCard | Reanimated 2 | useSharedValue/withTiming/useAnimatedStyle | Three-dot press |
| Post Action Toast | PostCard | Reanimated 2 | useSharedValue/withTiming/runOnJS | Archive/Delete success |
| Confirmation Modal | ConfirmationModal | Reanimated 2 | useSharedValue/withTiming/useAnimatedStyle | Confirmable action |
| Story Options Dropdown | StoryScreen | Reanimated 2 | useSharedValue/withTiming/useAnimatedStyle | Three-dot press |
| Photo Pinch Zoom | ZoomableImage / PhotoViewer | Reanimated 2 | useSharedValue/clamp/withSpring | Gesture.Simultaneous(PinchGesture, PanGesture) |
| Photo Boundary Pan | ZoomableImage / PhotoViewer | Reanimated 2 | useSharedValue/clamp/withSpring | PanGesture (while zoomed) |
| Photo Swipe-Down Dismiss | ZoomableImage / PhotoViewer | Reanimated 2 | useSharedValue/runOnJS/withSpring | PanGesture swipe-down (at 1×) |
| Photo Double-Tap Zoom | ZoomableImage / PhotoViewer | Reanimated 2 | useSharedValue/withSpring | TapGesture (×2) |
| Photo Viewer Backdrop | PhotoViewer | Reanimated 2 | useSharedValue/withTiming/useAnimatedStyle | Modal open/close |
| Photo Viewer Toolbar Fade | PhotoViewer | Reanimated 2 | useSharedValue/withTiming/useAnimatedStyle | Modal open/close |
| Story Swipe-Up Dismiss | StoryScreen | Reanimated 2 | useSharedValue/withTiming/withSpring/runOnJS | PanGesture swipe-up |
| Story Pinch Zoom | StoryScreen (ZoomableImage) | Reanimated 2 | useSharedValue/clamp/withSpring | Gesture.Simultaneous(Pinch, Pan) |
