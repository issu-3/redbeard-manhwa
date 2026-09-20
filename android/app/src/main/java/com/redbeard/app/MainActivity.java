package com.redbeard.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Prevent Android from restoring the WebView's last URL/history on cold boot.
        // This ensures the local android-shell (index.html) always runs first.
        if (savedInstanceState != null) {
            savedInstanceState.remove("android:viewHierarchyState");
        }
        super.onCreate(savedInstanceState);
    }
}
