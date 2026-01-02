#!/bin/bash
echo "=== Android Build Status ==="
if docker ps | grep -q miradigital; then
    echo "Build is RUNNING..."
    echo ""
    echo "Latest logs:"
    tail -20 /opt/middleware/MiraDigital/mobile-app/android-build.log
else
    echo "Build container has STOPPED."
    echo ""
    if [ -f "/opt/middleware/MiraDigital/mobile-app/docker-build/output/app-release.apk" ]; then
        echo "SUCCESS! APK is ready:"
        ls -lh /opt/middleware/MiraDigital/mobile-app/docker-build/output/app-release.apk
    else
        echo "Build may have FAILED. Last 50 lines of log:"
        tail -50 /opt/middleware/MiraDigital/mobile-app/android-build.log
    fi
fi
